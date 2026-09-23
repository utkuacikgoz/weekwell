/**
 * Weekwell API client. Only active when EXPO_PUBLIC_API_URL is set at build
 * time; otherwise the app runs fully on-device (the pilot default).
 * The URL is fixed at build time and can't be changed from a link.
 */
import type { EntitlementView, Plan, ProductId, RepairAction, UserPreferences } from '@weekwell/domain';
import type { StoredPrices } from '../state/store';
import { clearToken, getToken, setToken } from './session';

export const API_URL: string | null = process.env.EXPO_PUBLIC_API_URL ? process.env.EXPO_PUBLIC_API_URL.replace(/\/$/u, '') : null;

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail?: Record<string, unknown>,
  ) {
    super(code);
    this.name = 'ApiRequestError';
  }
}

export type PlanState = { plan: Plan; checked: string[]; skipped: string[] };

const TIMEOUT_MS = 12_000;

async function request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  if (!API_URL) throw new ApiRequestError(0, 'no_api');
  const token = auth ? await getToken() : null;
  if (auth && !token) throw new ApiRequestError(401, 'unauthorized');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiRequestError(0, controller.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 401 && auth) await clearToken();
    throw new ApiRequestError(res.status, typeof json.error === 'string' ? json.error : 'error', json);
  }
  return json as T;
}

const newRequestKey = () => `k_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
const weekOf = (d = new Date()) => {
  const monday = new Date(d);
  monday.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return monday.toISOString().slice(0, 10);
};

export const api = {
  enabled: API_URL !== null,
  async signedIn() {
    return (await getToken()) !== null;
  },
  startSignIn: (email: string) => request<{ sent: true; devCode?: string }>('POST', '/auth/start', { email }, false),
  async verify(email: string, code: string) {
    const res = await request<{ token: string; userId: string }>('POST', '/auth/verify', { email, code }, false);
    await setToken(res.token);
    return res;
  },
  async signOut() {
    await request('POST', '/auth/logout').catch(() => {});
    await clearToken();
  },
  current: () => request<PlanState>('GET', '/plans/current'),
  generate: (preferences: UserPreferences) => request<PlanState>('POST', '/plans', { preferences, weekOf: weekOf(), requestKey: newRequestKey() }),
  prices: (planId: string) => request<StoredPrices>('GET', `/plans/${planId}/prices`),
  saveList: (planId: string, checked: string[], skipped: string[]) => request('PUT', `/plans/${planId}/list`, { checked, skipped }),
  repair: (planId: string, mealId: string, action: RepairAction) => request<PlanState & { previousRecipeId: string }>('POST', `/plans/${planId}/meals/${mealId}/repair`, { action }),
  setMeal: (planId: string, mealId: string, recipeId: string) => request<{ plan: Plan; checked: string[] }>('PUT', `/plans/${planId}/meals/${mealId}`, { recipeId }),
  applyPreferences: (planId: string, preferences: UserPreferences) => request<PlanState>('POST', `/plans/${planId}/preferences`, { preferences }),
  rebuild: (planId: string) => request<PlanState>('POST', `/plans/${planId}/rebuild-under-budget`),
  makeCurrent: (planId: string) => request<PlanState>('POST', `/plans/${planId}/make-current`),
  entitlement: () => request<EntitlementView>('GET', '/entitlement'),
  startTrial: (productId: ProductId) => request<EntitlementView>('POST', '/entitlement/trial', { productId }),
  purchase: (productId: ProductId) => request<EntitlementView>('POST', '/entitlement/purchase', { productId }),
  restore: () => request<{ result: 'restored' | 'nothing_to_restore'; entitlement: EntitlementView }>('POST', '/entitlement/restore'),
  async deleteAccount() {
    await request('DELETE', '/me');
    await clearToken();
  },
};
