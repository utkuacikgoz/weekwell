/**
 * App state for the first slice. Persists the current plan, preferences,
 * checks, and last price check on-device so the week and list work offline.
 * Exclusions are stored only on this device and cleared by "Delete my data".
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BUDGET_DEFAULT,
  FixtureRetailerProvider,
  PlanSchema,
  buildGroceryList,
  checkFeasibility,
  diffGroceryLists,
  findReplacement,
  preferencesCompletedProps,
  priceGroceryList,
  reconcileChecks,
  replaceMeal,
  restoreMeal,
  type EntitlementRecord,
  type EntitlementView,
  type GenerationErrorCode,
  type GroceryDiff,
  type GroceryItem,
  type ItemPrice,
  type Meal,
  type Plan,
  type ProductId,
  type RepairAction,
  type Retailer,
  type ShopTotal,
  type UserPreferences,
} from '@weekwell/domain';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { makeAnalytics, newAnonId } from '../services/analytics';
import { ApiRequestError, api } from '../services/api';
import { MockEntitlementServer } from '../services/entitlement';
import { generatePlan } from '../services/generation';
import { haptic, setHapticsEnabled } from '../services/haptics';
import { DEFAULT_SCENARIOS, scenariosFromUrl, type Scenarios } from '../services/scenarios';

const STORAGE_KEY = 'weekwell:v1';

export type Draft = Omit<UserPreferences, 'retailer'> & { retailer: Retailer | null };

export const DEFAULT_DRAFT: Draft = {
  retailer: null, // the one choice we never guess
  weeklyBudget: BUDGET_DEFAULT,
  proteinGoal: 'high_protein',
  maxMinutes: 30,
  householdSize: 1,
  exclusions: [],
};

export type PriceCheck =
  | { status: 'idle' }
  | { status: 'loading'; previous?: StoredPrices }
  | { status: 'done'; prices: StoredPrices };

export type StoredPrices = {
  retailer: Retailer;
  checkedAt: string;
  items: [string, ItemPrice][];
  total: ShopTotal;
};

export type PlanChange = { kind: 'preferences'; prefs: UserPreferences; localPlan: Plan } | { kind: 'rebuild'; localPlan: Plan };

export type PlanUndo = { previous: Plan; previousChecked: string[]; previousSkipped: string[]; message: string };

export type SwapRecord = { previous: Meal; next: Meal; action: RepairAction; diff: GroceryDiff; changedChecked: number; removedChecked: number };

type Persisted = {
  anonId: string;
  draft: Draft;
  plan: Plan | null;
  checked: string[];
  skippedMealIds: string[];
  prices: StoredPrices | null;
  hapticsEnabled: boolean;
  entitlement: EntitlementRecord | null;
  onboardingDone: boolean;
};

const EMPTY: Persisted = {
  anonId: '',
  draft: DEFAULT_DRAFT,
  plan: null,
  checked: [],
  skippedMealIds: [],
  prices: null,
  hapticsEnabled: true,
  entitlement: null,
  onboardingDone: false,
};

export type GenerationState =
  | { status: 'idle' }
  | { status: 'running'; step: number }
  | { status: 'failed'; code: GenerationErrorCode; message?: string; suggestions?: string[] };

type Ctx = {
  hydrated: boolean;
  data: Persisted;
  scenarios: Scenarios;
  priceCheck: PriceCheck;
  generation: GenerationState;
  entitlementView: EntitlementView;
  lastSwap: SwapRecord | null;
  groceryItems: GroceryItem[];
  analytics: ReturnType<typeof makeAnalytics> | null;
  setDraft: (patch: Partial<Draft>) => void;
  generate: () => Promise<boolean>;
  refreshPrices: () => Promise<void>;
  toggleChecked: (itemId: string) => void;
  toggleMealOnList: (mealId: string) => void;
  repairMeal: (mealId: string, action: RepairAction) => Promise<SwapRecord | null>;
  undoSwap: () => Promise<void>;
  dismissSwap: () => void;
  applyPlan: (change: PlanChange, undoMessage?: string) => Promise<'ok' | 'failed'>;
  planUndo: PlanUndo | null;
  undoPlanChange: () => void;
  dismissPlanUndo: () => void;
  setHaptics: (on: boolean) => void;
  refreshEntitlement: () => Promise<void>;
  startTrial: (productId: ProductId) => Promise<'ok' | 'trial_already_used' | 'failed'>;
  purchase: (productId: ProductId) => Promise<'ok' | 'failed'>;
  restorePurchases: () => Promise<'restored' | 'nothing_to_restore' | 'failed'>;
  deleteAllData: () => Promise<'ok' | 'failed'>;
  /** True when this build talks to the Weekwell API (EXPO_PUBLIC_API_URL). */
  remote: boolean;
  signedIn: boolean;
  startSignIn: (email: string) => Promise<{ ok: true; devCode?: string } | { ok: false; reason: 'invalid' | 'rate_limited' | 'network' }>;
  verifySignIn: (email: string, code: string) => Promise<'ok' | 'invalid' | 'network'>;
  signOut: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}

export function isCompleteDraft(d: Draft): d is UserPreferences {
  return d.retailer !== null;
}

function listKeyOf(items: readonly GroceryItem[]): string {
  return items.map((i) => `${i.id}:${i.amount}`).join('|');
}

function toStored(result: Awaited<ReturnType<typeof priceGroceryList>>): StoredPrices {
  return { retailer: result.retailer, checkedAt: result.checkedAt, items: [...result.items.entries()], total: result.total };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<Persisted>(EMPTY);
  const [scenarios] = useState<Scenarios>(() => ({ ...DEFAULT_SCENARIOS, ...scenariosFromUrl() }));
  const [priceCheck, setPriceCheck] = useState<PriceCheck>({ status: 'idle' });
  const [generation, setGeneration] = useState<GenerationState>({ status: 'idle' });
  const [entitlementView, setEntitlementView] = useState<EntitlementView>({ state: 'loading' });
  const [lastSwap, setLastSwap] = useState<SwapRecord | null>(null);
  const [planUndo, setPlanUndo] = useState<PlanUndo | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const remote = api.enabled;
  const server = useRef<MockEntitlementServer | null>(null);

  // Hydrate from device storage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded: Persisted = EMPTY;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) loaded = { ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) };
      } catch {
        loaded = EMPTY;
      }
      if (!loaded.anonId) loaded = { ...loaded, anonId: newAnonId() };
      // Never render a stored plan that no longer passes validation (e.g. after a schema change).
      if (loaded.plan && !PlanSchema.safeParse(loaded.plan).success) loaded = { ...loaded, plan: null, prices: null, checked: [] };
      if (cancelled) return;
      server.current = scenarios.entitlement
        ? MockEntitlementServer.seeded('local_user', scenarios.entitlement)
        : loaded.entitlement
          ? new MockEntitlementServer(loaded.entitlement)
          : MockEntitlementServer.fresh('local_user');
      setHapticsEnabled(loaded.hapticsEnabled);
      if (remote && (await api.signedIn())) {
        setSignedIn(true);
        // The server is the source of truth; the cached copy covers offline use.
        try {
          const cur = await api.current();
          loaded = { ...loaded, plan: cur.plan, checked: cur.checked, skippedMealIds: cur.skipped, draft: cur.plan.preferences };
        } catch (e) {
          if (e instanceof ApiRequestError && e.status === 404) loaded = { ...loaded, plan: null, prices: null, checked: [], skippedMealIds: [] };
          if (e instanceof ApiRequestError && e.status === 401) setSignedIn(false);
        }
      }
      if (cancelled) return;
      setData(loaded);
      if (loaded.prices) setPriceCheck({ status: 'done', prices: loaded.prices });
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // Hydrate once on mount; scenarios are fixed for the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data, hydrated]);

  const analytics = useMemo(() => (data.anonId ? makeAnalytics(data.anonId) : null), [data.anonId]);

  const groceryItems = useMemo(() => {
    if (!data.plan) return [];
    const meals = [...data.plan.dinners, ...data.plan.lunches].filter((m) => !data.skippedMealIds.includes(m.id));
    return buildGroceryList(meals);
  }, [data.plan, data.skippedMealIds]);

  const refreshEntitlement = useCallback(async () => {
    setEntitlementView({ state: 'loading' });
    try {
      if (remote) setEntitlementView((await api.signedIn()) ? await api.entitlement() : { state: 'none', trialEligible: true });
      else if (server.current) setEntitlementView(await server.current.view());
    } catch {
      setEntitlementView({ state: 'error' });
    }
  }, [remote]);

  useEffect(() => {
    // Deferred one tick so the effect itself doesn't set state synchronously.
    if (hydrated) void Promise.resolve().then(refreshEntitlement);
  }, [hydrated, refreshEntitlement, signedIn]);

  // Remote mode: grocery state is saved to the server shortly after each change.
  const listTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncList = useCallback(
    (planId: string, checked: string[], skipped: string[]) => {
      if (!remote) return;
      if (listTimer.current) clearTimeout(listTimer.current);
      listTimer.current = setTimeout(() => void api.saveList(planId, checked, skipped).catch(() => {}), 600);
    },
    [remote],
  );

  const lastPricedKey = useRef('');
  const runPriceCheck = useCallback(
    async (plan: Plan, items: GroceryItem[]) => {
      lastPricedKey.current = listKeyOf(items);
      setPriceCheck((prev) => ({ status: 'loading', previous: prev.status === 'done' ? prev.prices : undefined }));
      let stored: StoredPrices;
      if (remote) {
        try {
          stored = await api.prices(plan.id);
        } catch {
          // Fail closed: no total without a price check.
          const ids = items.filter((i) => !i.staple).map((i) => i.id);
          stored = {
            retailer: plan.preferences.retailer,
            checkedAt: new Date().toISOString(),
            items: [],
            total: { status: 'withheld', reason: 'provider_unavailable', missingItemIds: ids, itemCount: ids.length },
          };
        }
      } else {
        const provider = new FixtureRetailerProvider(plan.preferences.retailer, scenarios.prices);
        if (scenarios.priceDelayMs > 0) await new Promise((r) => setTimeout(r, scenarios.priceDelayMs));
        stored = toStored(await priceGroceryList(provider, items));
      }
      setPriceCheck({ status: 'done', prices: stored });
      setData((d) => ({ ...d, prices: stored }));
      return stored;
    },
    [remote, scenarios.prices, scenarios.priceDelayMs],
  );

  const refreshPrices = useCallback(async () => {
    if (data.plan) await runPriceCheck(data.plan, groceryItems);
  }, [data.plan, groceryItems, runPriceCheck]);

  const generate = useCallback(async () => {
    const draft = data.draft;
    if (!isCompleteDraft(draft)) return false;
    const started = Date.now();
    analytics?.track('preferences_completed', preferencesCompletedProps(draft));
    analytics?.track('plan_generation_started', { retailer: draft.retailer, goal: draft.proteinGoal });
    setGeneration({ status: 'running', step: 0 });
    let result: Awaited<ReturnType<typeof generatePlan>>;
    let serverList: { checked: string[]; skipped: string[] } | null = null;
    if (remote) {
      try {
        const res = await api.generate(draft);
        result = { ok: true, plan: res.plan };
        serverList = { checked: res.checked, skipped: res.skipped };
      } catch (e) {
        const status = e instanceof ApiRequestError ? e.status : 0;
        const code = e instanceof ApiRequestError ? e.code : 'network';
        if (code === 'exclusion_conflict') {
          const f = checkFeasibility(draft);
          result = { ok: false, code: 'exclusion_conflict', message: f.ok ? undefined : f.message, suggestions: f.ok ? undefined : f.suggestions };
        } else if (status === 401) {
          setSignedIn(false);
          result = { ok: false, code: 'unauthorized' };
        } else if (status === 403) result = { ok: false, code: 'subscription_required' };
        else if (status === 429) result = { ok: false, code: 'rate_limited' };
        else if (status === 0) result = { ok: false, code: 'timeout' };
        else result = { ok: false, code: 'provider_error' };
      }
    } else {
      result = await generatePlan(draft, 'local_user', scenarios.generation);
    }
    if (!result.ok) {
      analytics?.track('plan_generation_failed', { errorCode: result.code });
      setGeneration({ status: 'failed', code: result.code, message: result.message, suggestions: result.suggestions });
      haptic.warning();
      return false;
    }
    setGeneration({ status: 'running', step: 2 });
    const items = buildGroceryList([...result.plan.dinners, ...result.plan.lunches]);
    const prices = await runPriceCheck(result.plan, items);
    setData((d) => ({ ...d, plan: result.plan, checked: serverList?.checked ?? [], skippedMealIds: serverList?.skipped ?? [], onboardingDone: true }));
    setLastSwap(null);
    const budgetCents = draft.weeklyBudget * 100;
    analytics?.track('plan_generation_succeeded', {
      retailer: draft.retailer,
      goal: draft.proteinGoal,
      durationMs: Date.now() - started,
      priceStatus: prices.total.status,
      overBudget: prices.total.status === 'available' && prices.total.totalCents > budgetCents,
    });
    setGeneration({ status: 'idle' });
    haptic.success();
    return true;
  }, [analytics, data.draft, remote, runPriceCheck, scenarios.generation]);

  const toggleChecked = useCallback(
    (itemId: string) => {
      const item = groceryItems.find((i) => i.id === itemId);
      if (!item) return;
      const isChecked = data.checked.includes(itemId);
      const checked = isChecked ? data.checked.filter((id) => id !== itemId) : [...data.checked, itemId];
      setData((d) => ({ ...d, checked }));
      if (data.plan) syncList(data.plan.id, checked, data.skippedMealIds);
      analytics?.track('grocery_item_checked', {
        checked: !isChecked,
        section: item.section,
        checkedCount: checked.filter((id) => groceryItems.some((g) => g.id === id)).length,
        totalCount: groceryItems.length,
      });
      if (!isChecked) haptic.check();
    },
    [analytics, data.checked, data.plan, data.skippedMealIds, groceryItems, syncList],
  );

  const commitPlanChange = useCallback(
    (plan: Plan, diff: GroceryDiff) => {
      const meals = [...plan.dinners, ...plan.lunches].filter((m) => !data.skippedMealIds.includes(m.id));
      const after = buildGroceryList(meals);
      const r = reconcileChecks(new Set(data.checked), diff, after);
      setData((d) => ({ ...d, plan, checked: [...r.checked] }));
      syncList(plan.id, [...r.checked], data.skippedMealIds);
      void runPriceCheck(plan, after);
      return r;
    },
    [data.checked, data.skippedMealIds, runPriceCheck, syncList],
  );

  const repairMeal = useCallback(
    async (mealId: string, action: RepairAction): Promise<SwapRecord | null> => {
      const plan = data.plan;
      if (!plan) return null;
      let res: { plan: Plan; previous: Meal; next: Meal; diff: GroceryDiff };
      if (remote) {
        try {
          const out = await api.repair(plan.id, mealId, action);
          const meals = (p: Plan) => [...p.dinners, ...p.lunches];
          const index = meals(plan).findIndex((m) => m.id === mealId);
          res = {
            plan: out.plan,
            previous: meals(plan)[index] as Meal,
            next: meals(out.plan)[index] as Meal,
            diff: diffGroceryLists(buildGroceryList(meals(plan)), buildGroceryList(meals(out.plan))),
          };
        } catch {
          haptic.warning();
          return null;
        }
      } else {
        const recipe = findReplacement(plan, mealId, action);
        if (!recipe) {
          haptic.warning();
          return null;
        }
        res = replaceMeal(plan, mealId, recipe);
      }
      const r = commitPlanChange(res.plan, res.diff);
      const record: SwapRecord = {
        previous: res.previous,
        next: res.next,
        action,
        diff: res.diff,
        changedChecked: r.changedChecked.length,
        removedChecked: r.removedChecked.length,
      };
      setLastSwap(record);
      analytics?.track('meal_swapped', { slot: res.next.slot, day: res.next.day, action, undone: false });
      haptic.success();
      return record;
    },
    [analytics, commitPlanChange, data.plan, remote],
  );

  const undoSwap = useCallback(async () => {
    if (!data.plan || !lastSwap) return;
    if (remote) {
      try {
        const out = await api.setMeal(data.plan.id, lastSwap.previous.id, lastSwap.previous.recipeId);
        const meals = (p: Plan) => [...p.dinners, ...p.lunches];
        commitPlanChange(out.plan, diffGroceryLists(buildGroceryList(meals(data.plan)), buildGroceryList(meals(out.plan))));
      } catch {
        haptic.warning();
        return;
      }
    } else {
      const res = restoreMeal(data.plan, lastSwap.previous);
      commitPlanChange(res.plan, res.diff);
    }
    analytics?.track('meal_swapped', { slot: lastSwap.previous.slot, day: lastSwap.previous.day, action: lastSwap.action, undone: true });
    setLastSwap(null);
  }, [analytics, commitPlanChange, data.plan, lastSwap, remote]);

  const toggleMealOnList = useCallback(
    (mealId: string) => {
      const skipped = data.skippedMealIds.includes(mealId) ? data.skippedMealIds.filter((id) => id !== mealId) : [...data.skippedMealIds, mealId];
      setData((d) => ({ ...d, skippedMealIds: skipped }));
      if (data.plan) syncList(data.plan.id, data.checked, skipped);
    },
    [data.checked, data.plan, data.skippedMealIds, syncList],
  );

  // Re-price when the list composition changes (e.g. a meal removed from the list).
  const listKey = listKeyOf(groceryItems);
  useEffect(() => {
    if (!hydrated || !data.plan || groceryItems.length === 0) return;
    if (lastPricedKey.current === '') {
      lastPricedKey.current = listKey;
      return;
    }
    if (lastPricedKey.current === listKey) return;
    lastPricedKey.current = listKey;
    void runPriceCheck(data.plan, groceryItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey, hydrated]);

  const applyPlan = useCallback(
    async (change: PlanChange, undoMessage?: string): Promise<'ok' | 'failed'> => {
      if (!data.plan) return 'failed';
      let plan = change.localPlan;
      let serverChecked: string[] | null = null;
      if (remote) {
        try {
          const out = change.kind === 'preferences' ? await api.applyPreferences(data.plan.id, change.prefs) : await api.rebuild(data.plan.id);
          plan = out.plan;
          serverChecked = out.checked;
        } catch {
          haptic.warning();
          return 'failed';
        }
      }
      if (undoMessage) setPlanUndo({ previous: data.plan, previousChecked: data.checked, previousSkipped: data.skippedMealIds, message: undoMessage });
      else setPlanUndo(null);
      const before = groceryItems;
      const after = buildGroceryList([...plan.dinners, ...plan.lunches]);
      const r = reconcileChecks(new Set(data.checked), diffGroceryLists(before, after), after);
      const checked = serverChecked ?? [...r.checked];
      setData((d) => ({ ...d, plan, draft: plan.preferences, checked, skippedMealIds: [] }));
      setLastSwap(null);
      void runPriceCheck(plan, after);
      return 'ok';
    },
    [data.checked, data.plan, data.skippedMealIds, groceryItems, remote, runPriceCheck],
  );

  /** Undo the last whole-plan change (e.g. "Rebuild under budget"). */
  const undoPlanChange = useCallback(() => {
    if (!planUndo) return;
    const { previous, previousChecked, previousSkipped } = planUndo;
    if (remote) {
      void api
        .makeCurrent(previous.id)
        .then(() => api.saveList(previous.id, previousChecked, previousSkipped))
        .catch(() => {});
    }
    setData((d) => ({ ...d, plan: previous, draft: previous.preferences, checked: previousChecked, skippedMealIds: previousSkipped }));
    setPlanUndo(null);
    const meals = [...previous.dinners, ...previous.lunches].filter((m) => !previousSkipped.includes(m.id));
    void runPriceCheck(previous, buildGroceryList(meals));
  }, [planUndo, remote, runPriceCheck]);

  const setHaptics = useCallback((on: boolean) => {
    setHapticsEnabled(on);
    setData((d) => ({ ...d, hapticsEnabled: on }));
  }, []);

  const startTrial = useCallback(
    async (productId: ProductId) => {
      if (remote) {
        try {
          setEntitlementView(await api.startTrial(productId));
          analytics?.track('trial_started', { productId });
          haptic.success();
          return 'ok' as const;
        } catch (e) {
          haptic.warning();
          return e instanceof ApiRequestError && e.code === 'trial_already_used' ? ('trial_already_used' as const) : ('failed' as const);
        }
      }
      if (!server.current) return 'failed' as const;
      const res = await server.current.startTrial(productId);
      if (res.ok) {
        setEntitlementView(res.view);
        setData((d) => ({ ...d, entitlement: server.current?.snapshot() ?? null }));
        analytics?.track('trial_started', { productId });
        haptic.success();
        return 'ok' as const;
      }
      haptic.warning();
      return res.reason;
    },
    [analytics, remote],
  );

  const purchase = useCallback(
    async (productId: ProductId) => {
      if (remote) {
        try {
          setEntitlementView(await api.purchase(productId));
          analytics?.track('subscription_started', { productId });
          haptic.success();
          return 'ok' as const;
        } catch {
          haptic.warning();
          return 'failed' as const;
        }
      }
      if (!server.current) return 'failed' as const;
      const res = await server.current.purchase(productId);
      if (!res.ok) {
        haptic.warning();
        return 'failed' as const;
      }
      setEntitlementView(res.view);
      setData((d) => ({ ...d, entitlement: server.current?.snapshot() ?? null }));
      analytics?.track('subscription_started', { productId });
      haptic.success();
      return 'ok' as const;
    },
    [analytics, remote],
  );

  const restorePurchases = useCallback(async () => {
    let result: 'restored' | 'nothing_to_restore' | 'failed';
    if (remote) {
      try {
        const out = await api.restore();
        result = out.result;
        setEntitlementView(out.entitlement);
      } catch {
        result = 'failed';
      }
    } else {
      if (!server.current) return 'failed' as const;
      result = await server.current.restore(scenarios.restore);
    }
    analytics?.track('subscription_restored', { result });
    if (result === 'restored') await refreshEntitlement();
    if (result === 'failed') haptic.warning();
    return result;
  }, [analytics, refreshEntitlement, remote, scenarios.restore]);

  const deleteAllData = useCallback(async (): Promise<'ok' | 'failed'> => {
    if (remote && signedIn) {
      try {
        await api.deleteAccount();
      } catch {
        // Nothing is deleted locally unless the account is gone too.
        return 'failed';
      }
      setSignedIn(false);
    }
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    server.current = MockEntitlementServer.fresh('local_user');
    lastPricedKey.current = '';
    setData({ ...EMPTY, anonId: newAnonId() });
    setPriceCheck({ status: 'idle' });
    setLastSwap(null);
    setGeneration({ status: 'idle' });
    await refreshEntitlement();
    return 'ok';
  }, [refreshEntitlement, remote, signedIn]);

  const startSignIn = useCallback(async (email: string) => {
    try {
      const res = await api.startSignIn(email);
      return { ok: true as const, devCode: res.devCode };
    } catch (e) {
      const status = e instanceof ApiRequestError ? e.status : 0;
      return { ok: false as const, reason: status === 400 ? ('invalid' as const) : status === 429 ? ('rate_limited' as const) : ('network' as const) };
    }
  }, []);

  const verifySignIn = useCallback(async (email: string, code: string) => {
    try {
      await api.verify(email, code);
      setSignedIn(true);
      return 'ok' as const;
    } catch (e) {
      return e instanceof ApiRequestError && e.status === 401 ? ('invalid' as const) : ('network' as const);
    }
  }, []);

  const signOut = useCallback(async () => {
    await api.signOut();
    setSignedIn(false);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    setData({ ...EMPTY, anonId: newAnonId() });
    setPriceCheck({ status: 'idle' });
  }, []);

  const value: Ctx = {
    hydrated,
    data,
    scenarios,
    priceCheck,
    generation,
    entitlementView,
    lastSwap,
    groceryItems,
    analytics,
    setDraft: (patch) => setData((d) => ({ ...d, draft: { ...d.draft, ...patch } })),
    generate,
    refreshPrices,
    toggleChecked,
    toggleMealOnList,
    repairMeal,
    undoSwap,
    dismissSwap: () => setLastSwap(null),
    applyPlan,
    planUndo,
    undoPlanChange,
    dismissPlanUndo: () => setPlanUndo(null),
    setHaptics,
    refreshEntitlement,
    startTrial,
    purchase,
    restorePurchases,
    deleteAllData,
    remote,
    signedIn,
    startSignIn,
    verifySignIn,
    signOut,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
