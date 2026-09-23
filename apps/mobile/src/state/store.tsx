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
  repairMeal: (mealId: string, action: RepairAction) => SwapRecord | null;
  undoSwap: () => void;
  dismissSwap: () => void;
  applyPlan: (plan: Plan, undoMessage?: string) => void;
  planUndo: PlanUndo | null;
  undoPlanChange: () => void;
  dismissPlanUndo: () => void;
  setHaptics: (on: boolean) => void;
  refreshEntitlement: () => Promise<void>;
  startTrial: (productId: ProductId) => Promise<'ok' | 'trial_already_used' | 'failed'>;
  restorePurchases: () => Promise<'restored' | 'nothing_to_restore' | 'failed'>;
  deleteAllData: () => Promise<void>;
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
      server.current = loaded.entitlement ? new MockEntitlementServer(loaded.entitlement) : MockEntitlementServer.fresh('local_user');
      setHapticsEnabled(loaded.hapticsEnabled);
      setData(loaded);
      if (loaded.prices) setPriceCheck({ status: 'done', prices: loaded.prices });
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
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
    if (!server.current) return;
    setEntitlementView({ state: 'loading' });
    try {
      setEntitlementView(await server.current.view());
    } catch {
      setEntitlementView({ state: 'error' });
    }
  }, []);

  useEffect(() => {
    if (hydrated) void refreshEntitlement();
  }, [hydrated, refreshEntitlement]);

  const lastPricedKey = useRef('');
  const runPriceCheck = useCallback(
    async (plan: Plan, items: GroceryItem[]) => {
      lastPricedKey.current = listKeyOf(items);
      setPriceCheck((prev) => ({ status: 'loading', previous: prev.status === 'done' ? prev.prices : undefined }));
      const provider = new FixtureRetailerProvider(plan.preferences.retailer, scenarios.prices);
      if (scenarios.priceDelayMs > 0) await new Promise((r) => setTimeout(r, scenarios.priceDelayMs));
      const result = await priceGroceryList(provider, items);
      const stored = toStored(result);
      setPriceCheck({ status: 'done', prices: stored });
      setData((d) => ({ ...d, prices: stored }));
      return stored;
    },
    [scenarios.prices, scenarios.priceDelayMs],
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
    const result = await generatePlan(draft, 'local_user', scenarios.generation);
    if (!result.ok) {
      analytics?.track('plan_generation_failed', { errorCode: result.code });
      setGeneration({ status: 'failed', code: result.code, message: result.message, suggestions: result.suggestions });
      haptic.warning();
      return false;
    }
    setGeneration({ status: 'running', step: 2 });
    const items = buildGroceryList([...result.plan.dinners, ...result.plan.lunches]);
    const prices = await runPriceCheck(result.plan, items);
    setData((d) => ({ ...d, plan: result.plan, checked: [], skippedMealIds: [], onboardingDone: true }));
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
  }, [analytics, data.draft, runPriceCheck, scenarios.generation]);

  const toggleChecked = useCallback(
    (itemId: string) => {
      const item = groceryItems.find((i) => i.id === itemId);
      if (!item) return;
      const isChecked = data.checked.includes(itemId);
      const checked = isChecked ? data.checked.filter((id) => id !== itemId) : [...data.checked, itemId];
      setData((d) => ({ ...d, checked }));
      analytics?.track('grocery_item_checked', {
        checked: !isChecked,
        section: item.section,
        checkedCount: checked.filter((id) => groceryItems.some((g) => g.id === id)).length,
        totalCount: groceryItems.length,
      });
      if (!isChecked) haptic.check();
    },
    [analytics, data.checked, groceryItems],
  );

  const commitPlanChange = useCallback(
    (plan: Plan, diff: GroceryDiff) => {
      const meals = [...plan.dinners, ...plan.lunches].filter((m) => !data.skippedMealIds.includes(m.id));
      const after = buildGroceryList(meals);
      const r = reconcileChecks(new Set(data.checked), diff, after);
      setData((d) => ({ ...d, plan, checked: [...r.checked] }));
      void runPriceCheck(plan, after);
      return r;
    },
    [data.checked, data.skippedMealIds, runPriceCheck],
  );

  const repairMeal = useCallback(
    (mealId: string, action: RepairAction): SwapRecord | null => {
      const plan = data.plan;
      if (!plan) return null;
      const recipe = findReplacement(plan, mealId, action);
      if (!recipe) {
        haptic.warning();
        return null;
      }
      const res = replaceMeal(plan, mealId, recipe);
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
    [analytics, commitPlanChange, data.plan],
  );

  const undoSwap = useCallback(() => {
    if (!data.plan || !lastSwap) return;
    const res = restoreMeal(data.plan, lastSwap.previous);
    commitPlanChange(res.plan, res.diff);
    analytics?.track('meal_swapped', { slot: res.next.slot, day: res.next.day, action: lastSwap.action, undone: true });
    setLastSwap(null);
  }, [analytics, commitPlanChange, data.plan, lastSwap]);

  const toggleMealOnList = useCallback(
    (mealId: string) => {
      setData((d) => ({
        ...d,
        skippedMealIds: d.skippedMealIds.includes(mealId) ? d.skippedMealIds.filter((id) => id !== mealId) : [...d.skippedMealIds, mealId],
      }));
    },
    [],
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
    (plan: Plan, undoMessage?: string) => {
      if (undoMessage && data.plan) setPlanUndo({ previous: data.plan, previousChecked: data.checked, previousSkipped: data.skippedMealIds, message: undoMessage });
      else setPlanUndo(null);
      const before = groceryItems;
      const after = buildGroceryList([...plan.dinners, ...plan.lunches]);
      const beforeIds = new Set(before.map((i) => i.id));
      const afterIds = new Set(after.map((i) => i.id));
      const diff: GroceryDiff = {
        added: after.filter((i) => !beforeIds.has(i.id)),
        removed: before.filter((i) => !afterIds.has(i.id)),
        changed: after.filter((i) => before.some((b) => b.id === i.id && b.amount !== i.amount)).map((item) => ({ item, beforeAmount: before.find((b) => b.id === item.id)?.amount ?? 0 })),
      };
      const r = reconcileChecks(new Set(data.checked), diff, after);
      setData((d) => ({ ...d, plan, draft: plan.preferences, checked: [...r.checked], skippedMealIds: [] }));
      setLastSwap(null);
      void runPriceCheck(plan, after);
    },
    [data.checked, data.plan, data.skippedMealIds, groceryItems, runPriceCheck],
  );

  /** Undo the last whole-plan change (e.g. "Rebuild under budget"). */
  const undoPlanChange = useCallback(() => {
    if (!planUndo) return;
    const { previous, previousChecked, previousSkipped } = planUndo;
    setData((d) => ({ ...d, plan: previous, draft: previous.preferences, checked: previousChecked, skippedMealIds: previousSkipped }));
    setPlanUndo(null);
    const meals = [...previous.dinners, ...previous.lunches].filter((m) => !previousSkipped.includes(m.id));
    void runPriceCheck(previous, buildGroceryList(meals));
  }, [planUndo, runPriceCheck]);

  const setHaptics = useCallback((on: boolean) => {
    setHapticsEnabled(on);
    setData((d) => ({ ...d, hapticsEnabled: on }));
  }, []);

  const startTrial = useCallback(
    async (productId: ProductId) => {
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
    [analytics],
  );

  const restorePurchases = useCallback(async () => {
    if (!server.current) return 'failed' as const;
    const result = await server.current.restore(scenarios.restore);
    analytics?.track('subscription_restored', { result });
    if (result === 'restored') await refreshEntitlement();
    if (result === 'failed') haptic.warning();
    return result;
  }, [analytics, refreshEntitlement, scenarios.restore]);

  const deleteAllData = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    server.current = MockEntitlementServer.fresh('local_user');
    lastPricedKey.current = '';
    setData({ ...EMPTY, anonId: newAnonId() });
    setPriceCheck({ status: 'idle' });
    setLastSwap(null);
    setGeneration({ status: 'idle' });
    await refreshEntitlement();
  }, [refreshEntitlement]);

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
    restorePurchases,
    deleteAllData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
