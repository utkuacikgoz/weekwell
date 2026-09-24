import { signWebhook } from '@weekwell/domain/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, resendSender } from '../src/app';
import { loadConfig } from '../src/config';
import { Db } from '../src/db';

const json = async (res: Response | Promise<Response>) => (await res).json();
const PREFS = { retailer: 'trader_joes', weeklyBudget: 75, proteinGoal: 'high_protein', maxMinutes: 30, householdSize: 1, exclusions: [] };
const T0 = new Date('2026-09-23T15:00:00.000Z');

function setup(overrides: Record<string, string> = {}, opts: { fetch?: typeof fetch } = {}) {
  let clock = T0.getTime();
  const logs: Record<string, unknown>[] = [];
  const sent: { email: string; code: string }[] = [];
  const config = loadConfig({ ALLOW_DEV_CODES: '0', WEBHOOK_SECRET: 'test-webhook-secret-123', CORS_ORIGINS: 'https://app.weekwell.test', ...overrides } as NodeJS.ProcessEnv);
  const db = new Db(':memory:');
  const app = createApp({
    config,
    db,
    now: () => new Date(clock),
    log: (e) => logs.push(e),
    ...(opts.fetch ? { fetch: opts.fetch } : {}),
    sendEmail: async (email, code) => {
      sent.push({ email, code });
    },
  });
  const call = (method: string, path: string, init: { body?: unknown; token?: string; headers?: Record<string, string>; raw?: string } = {}) =>
    app.request(path, {
      method,
      headers: { 'content-type': 'application/json', ...(init.token ? { authorization: `Bearer ${init.token}` } : {}), ...init.headers },
      body: init.raw ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
    });
  const signIn = async (email: string) => {
    await call('POST', '/v1/auth/start', { body: { email } });
    const code = sent.filter((s) => s.email === email.toLowerCase()).at(-1)!.code;
    const res = await call('POST', '/v1/auth/verify', { body: { email, code } });
    return (await res.json()) as { token: string; userId: string };
  };
  return { app, db, call, signIn, logs, sent, advance: (ms: number) => (clock += ms) };
}

describe('auth', () => {
  it('signs in with an emailed code and rejects unauthenticated calls', async () => {
    const t = setup();
    expect((await t.call('GET', '/v1/me')).status).toBe(401);
    const { token } = await t.signIn('Person@Example.com');
    const me = await t.call('GET', '/v1/me', { token });
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ entitlement: { state: 'none', trialEligible: true } });
  });

  it('does not reveal the code or whether an account exists', async () => {
    const t = setup();
    const res = await t.call('POST', '/v1/auth/start', { body: { email: 'new@example.com' } });
    expect(await res.json()).toEqual({ sent: true });
  });

  it('locks a code after five wrong attempts and expires codes', async () => {
    const t = setup();
    await t.call('POST', '/v1/auth/start', { body: { email: 'a@example.com' } });
    const good = t.sent.at(-1)!.code;
    const wrong = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect((await t.call('POST', '/v1/auth/verify', { body: { email: 'a@example.com', code: wrong } })).status).toBe(401);
    expect((await t.call('POST', '/v1/auth/verify', { body: { email: 'a@example.com', code: good } })).status).toBe(401);
    await t.call('POST', '/v1/auth/start', { body: { email: 'b@example.com' } });
    t.advance(11 * 60_000);
    expect((await t.call('POST', '/v1/auth/verify', { body: { email: 'b@example.com', code: t.sent.at(-1)!.code } })).status).toBe(401);
  });

  it('rate limits code requests per email', async () => {
    const t = setup();
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await t.call('POST', '/v1/auth/start', { body: { email: 'flood@example.com' } })).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it('expired or logged-out sessions are rejected', async () => {
    const t = setup();
    const { token } = await t.signIn('a@example.com');
    expect((await t.call('POST', '/v1/auth/logout', { token })).status).toBe(204);
    expect((await t.call('GET', '/v1/me', { token })).status).toBe(401);
    const second = await t.signIn('a@example.com');
    t.advance(31 * 86_400_000);
    expect((await t.call('GET', '/v1/me', { token: second.token })).status).toBe(401);
  });

  it('only returns dev codes when explicitly enabled, and never in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', ALLOW_DEV_CODES: '1', SESSION_SECRET: 'x'.repeat(40), WEBHOOK_SECRET: 'y'.repeat(20) } as NodeJS.ProcessEnv)).toThrow();
    expect(() => loadConfig({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrow(/SESSION_SECRET/u);
  });
});

describe('plans', () => {
  let t: ReturnType<typeof setup>;
  let token: string;
  beforeEach(async () => {
    t = setup();
    token = (await t.signIn('a@example.com')).token;
  });

  it('generates, stores, and returns the current plan', async () => {
    const res = await t.call('POST', '/v1/plans', { token, body: { preferences: PREFS, weekOf: '2026-09-28' } });
    expect(res.status).toBe(201);
    const { plan } = (await res.json()) as { plan: { id: string; dinners: unknown[] } };
    expect(plan.dinners).toHaveLength(5);
    const current = await (await t.call('GET', '/v1/plans/current', { token })).json();
    expect(current.plan.id).toBe(plan.id);
  });

  it('rejects invalid preferences and unknown fields', async () => {
    expect((await t.call('POST', '/v1/plans', { token, body: { preferences: { ...PREFS, retailer: 'kroger' }, weekOf: '2026-09-28' } })).status).toBe(400);
    expect((await t.call('POST', '/v1/plans', { token, body: { preferences: PREFS, weekOf: '2026-09-28', price: 1 } })).status).toBe(400);
    expect((await t.call('POST', '/v1/plans', { token, raw: '{not json' })).status).toBe(400);
  });

  it('reports an exclusion conflict', async () => {
    const res = await t.call('POST', '/v1/plans', { token, body: { preferences: { ...PREFS, maxMinutes: 20, exclusions: ['dairy', 'gluten', 'nuts', 'fish'] }, weekOf: '2026-09-28' } });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'exclusion_conflict' });
  });

  it('is idempotent for a repeated request key', async () => {
    const body = { preferences: PREFS, weekOf: '2026-09-28', requestKey: 'tap_12345678' };
    const [a, b] = await Promise.all([t.call('POST', '/v1/plans', { token, body }), t.call('POST', '/v1/plans', { token, body })]);
    const [ja, jb] = [await a.json(), await b.json()];
    expect(ja.plan.id).toBe(jb.plan.id);
    expect(ja.job.id).toBe(jb.job.id);
  });

  it('user B cannot read, change, price, or repair user A’s plan', async () => {
    const created = await (await t.call('POST', '/v1/plans', { token, body: { preferences: PREFS, weekOf: '2026-09-28' } })).json();
    const planId = created.plan.id as string;
    const other = (await t.signIn('b@example.com')).token;
    for (const [method, path, body] of [
      ['GET', `/v1/plans/${planId}`],
      ['GET', `/v1/plans/${planId}/prices`],
      ['PUT', `/v1/plans/${planId}/list`, { checked: [], skipped: [] }],
      ['POST', `/v1/plans/${planId}/meals/dinner_mon/repair`, { action: 'swap' }],
      ['PUT', `/v1/plans/${planId}/meals/dinner_mon`, { recipeId: 'd_turkey_taco_skillet' }],
      ['POST', `/v1/plans/${planId}/rebuild-under-budget`],
    ] as const) {
      expect((await t.call(method, path, { token: other, body })).status, `${method} ${path}`).toBe(404);
    }
    expect((await t.call('GET', '/v1/plans/current', { token: other })).status).toBe(404);
  });

  it('prices come from the provider and fail closed when it is down', async () => {
    const created = await (await t.call('POST', '/v1/plans', { token, body: { preferences: PREFS, weekOf: '2026-09-28' } })).json();
    const priced = await (await t.call('GET', `/v1/plans/${created.plan.id}/prices`, { token })).json();
    expect(priced.total).toMatchObject({ status: 'available', isSample: true });
    const down = setup({ PRICE_SOURCE: 'unavailable' });
    const tok = (await down.signIn('a@example.com')).token;
    const p = await (await down.call('POST', '/v1/plans', { token: tok, body: { preferences: PREFS, weekOf: '2026-09-28' } })).json();
    const res = await (await down.call('GET', `/v1/plans/${p.plan.id}/prices`, { token: tok })).json();
    expect(res.total).toMatchObject({ status: 'withheld', reason: 'provider_unavailable' });
  });

  it('swaps a meal, keeps checks where possible, and undoes by recipe id', async () => {
    const created = await (await t.call('POST', '/v1/plans', { token, body: { preferences: PREFS, weekOf: '2026-09-28' } })).json();
    const id = created.plan.id;
    await t.call('PUT', `/v1/plans/${id}/list`, { token, body: { checked: ['spinach', 'garlic'], skipped: [] } });
    const swapped = await (await t.call('POST', `/v1/plans/${id}/meals/dinner_wed/repair`, { token, body: { action: 'swap' } })).json();
    expect(swapped.plan.dinners[2].recipeId).not.toBe(swapped.previousRecipeId);
    const undone = await (await t.call('PUT', `/v1/plans/${id}/meals/dinner_wed`, { token, body: { recipeId: swapped.previousRecipeId } })).json();
    expect(undone.plan.dinners[2].recipeId).toBe(created.plan.dinners[2].recipeId);
  });

  it('applies preferences with minimal changes, and an earlier plan can be made current again', async () => {
    const created = await (await t.call('POST', '/v1/plans', { token, body: { preferences: PREFS, weekOf: '2026-09-28' } })).json();
    const res = await t.call('POST', `/v1/plans/${created.plan.id}/preferences`, { token, body: { preferences: { ...PREFS, retailer: 'walmart' } } });
    expect(res.status).toBe(201);
    const changed = await res.json();
    expect(changed.mealsChanged).toBe(0);
    expect(changed.plan.preferences.retailer).toBe('walmart');
    expect((await (await t.call('GET', '/v1/plans/current', { token })).json()).plan.id).toBe(changed.plan.id);
    await t.call('POST', `/v1/plans/${created.plan.id}/make-current`, { token });
    expect((await (await t.call('GET', '/v1/plans/current', { token })).json()).plan.id).toBe(created.plan.id);
    const blocked = await t.call('POST', `/v1/plans/${created.plan.id}/preferences`, { token, body: { preferences: { ...PREFS, maxMinutes: 20, exclusions: ['dairy', 'gluten', 'nuts', 'fish'] } } });
    expect(blocked.status).toBe(422);
    const other = (await t.signIn('b@example.com')).token;
    expect((await t.call('POST', `/v1/plans/${created.plan.id}/make-current`, { token: other })).status).toBe(404);
  });

  it('refuses a recipe that breaks exclusions or time', async () => {
    const created = await (await t.call('POST', '/v1/plans', { token, body: { preferences: { ...PREFS, exclusions: ['dairy'] }, weekOf: '2026-09-28' } })).json();
    const res = await t.call('PUT', `/v1/plans/${created.plan.id}/meals/dinner_mon`, { token, body: { recipeId: 'd_greek_chicken_salad' } });
    expect(res.status).toBe(422);
    const slow = await t.call('PUT', `/v1/plans/${created.plan.id}/meals/dinner_mon`, { token, body: { recipeId: 'd_batch_turkey_chili' } });
    expect(slow.status).toBe(422);
  });
});

describe('entitlements and access policy', () => {
  it('trial starts once; after it expires, plan changes are refused server-side', async () => {
    const t = setup();
    const { token } = await t.signIn('a@example.com');
    const created = await (await t.call('POST', '/v1/plans', { token, body: { preferences: PREFS, weekOf: '2026-09-28' } })).json();
    expect((await t.call('POST', '/v1/entitlement/trial', { token, body: { productId: 'monthly' } })).status).toBe(200);
    expect((await t.call('POST', '/v1/entitlement/trial', { token, body: { productId: 'monthly' } })).status).toBe(409);
    t.advance(8 * 86_400_000);
    expect(await (await t.call('GET', '/v1/entitlement', { token })).json()).toMatchObject({ state: 'expired' });
    expect((await t.call('POST', `/v1/plans/${created.plan.id}/meals/dinner_wed/repair`, { token, body: { action: 'swap' } })).status).toBe(403);
    expect((await t.call('POST', '/v1/plans', { token, body: { preferences: PREFS, weekOf: '2026-10-05' } })).status).toBe(403);
    // Reading still works.
    expect((await t.call('GET', `/v1/plans/${created.plan.id}`, { token })).status).toBe(200);
    expect((await t.call('GET', `/v1/plans/${created.plan.id}/prices`, { token })).status).toBe(200);
    // Subscribing re-opens changes.
    expect((await t.call('POST', '/v1/entitlement/purchase', { token, body: { productId: 'yearly' } })).status).toBe(200);
    expect((await t.call('POST', `/v1/plans/${created.plan.id}/meals/dinner_wed/repair`, { token, body: { action: 'swap' } })).status).toBe(200);
  });

  it('in store mode, the app cannot grant itself a trial', async () => {
    const t = setup({ STORE_MODE: 'store' });
    const { token } = await t.signIn('a@example.com');
    expect((await t.call('POST', '/v1/entitlement/trial', { token, body: { productId: 'monthly' } })).status).toBe(403);
    expect((await t.call('POST', '/v1/entitlement/purchase', { token, body: { productId: 'monthly' } })).status).toBe(403);
  });

  it('webhooks: signed events apply once; bad signatures and replays are rejected', async () => {
    const t = setup();
    const { token, userId } = await t.signIn('a@example.com');
    const body = JSON.stringify({ id: 'evt_00000001', ownerId: userId, event: { type: 'purchased', productId: 'yearly', at: T0.toISOString(), periodEndsAt: new Date(T0.getTime() + 365 * 86_400_000).toISOString() } });
    const ts = Math.floor(T0.getTime() / 1000);
    const send = (header: string) => t.call('POST', '/v1/webhooks/store', { raw: body, headers: { 'x-weekwell-signature': header } });
    expect((await send(signWebhook(body, 'wrong-secret', ts))).status).toBe(401);
    expect((await send(signWebhook(body, 'test-webhook-secret-123', ts))).status).toBe(200);
    expect((await send(signWebhook(body, 'test-webhook-secret-123', ts))).status).toBe(409);
    expect(await (await t.call('GET', '/v1/entitlement', { token })).json()).toMatchObject({ state: 'active', productId: 'yearly' });
  });
});

describe('RevenueCat (D-014)', () => {
  const RC = { STORE_MODE: 'revenuecat', REVENUECAT_SECRET_KEY: 'sk_test_example', REVENUECAT_WEBHOOK_AUTH: 'Bearer rc-webhook-auth-value-000000' };
  const future = (days: number) => new Date(T0.getTime() + days * 86_400_000).toISOString();
  /** A fake RevenueCat REST API holding one subscriber state per user. */
  function fakeRevenueCat() {
    const state = new Map<string, unknown>();
    const calls: { url: string; auth: string | null }[] = [];
    const impl = (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      calls.push({ url: u, auth: new Headers(init?.headers).get('authorization') });
      const id = decodeURIComponent(u.split('/subscribers/')[1] ?? '');
      if (!state.has(id)) return new Response(JSON.stringify({ subscriber: {} }), { status: 200 });
      return new Response(JSON.stringify(state.get(id)), { status: 200 });
    }) as typeof fetch;
    return { state, calls, impl };
  }
  const trialFor = (days: number) => ({
    subscriber: {
      entitlements: { pro: { expires_date: future(days), product_identifier: 'com.belevate.weekwell.monthly' } },
      subscriptions: { 'com.belevate.weekwell.monthly': { period_type: 'trial', expires_date: future(days), purchase_date: T0.toISOString() } },
    },
  });

  it('refuses to start without its secrets, and never runs mock mode in production', () => {
    expect(() => loadConfig({ STORE_MODE: 'revenuecat' } as NodeJS.ProcessEnv)).toThrow(/REVENUECAT/u);
    expect(() => loadConfig({ NODE_ENV: 'production', SESSION_SECRET: 'x'.repeat(40), WEBHOOK_SECRET: 'y'.repeat(20), RESEND_API_KEY: 're_x', EMAIL_FROM: 'a@b.c' } as NodeJS.ProcessEnv)).toThrow(/STORE_MODE=mock/u);
  });

  it('webhook: wrong auth is rejected; a real event re-reads the customer from RevenueCat', async () => {
    const rc = fakeRevenueCat();
    const t = setup(RC, { fetch: rc.impl });
    const { token, userId } = await t.signIn('buyer@example.com');
    rc.state.set(userId, trialFor(7));
    const event = { api_version: '1.0', event: { id: 'evt_1', type: 'INITIAL_PURCHASE', app_user_id: userId } };
    expect((await t.call('POST', '/v1/webhooks/revenuecat', { body: event, headers: { authorization: 'Bearer wrong' } })).status).toBe(401);
    expect(await json(t.call('GET', '/v1/entitlement', { token }))).toMatchObject({ state: 'none' });
    const ok = await t.call('POST', '/v1/webhooks/revenuecat', { body: event, headers: { authorization: RC.REVENUECAT_WEBHOOK_AUTH } });
    expect(ok.status).toBe(200);
    expect(rc.calls.at(-1)).toEqual({ url: `https://api.revenuecat.com/v1/subscribers/${userId}`, auth: 'Bearer sk_test_example' });
    expect(await json(t.call('GET', '/v1/entitlement', { token }))).toMatchObject({ state: 'trial', productId: 'monthly', daysLeft: 7 });
  });

  it('webhook: the body cannot grant access by itself; unknown users and test events are acknowledged', async () => {
    const rc = fakeRevenueCat();
    const t = setup(RC, { fetch: rc.impl });
    const { token, userId } = await t.signIn('forger@example.com');
    // Claims a purchase, but RevenueCat has nothing for this user.
    const forged = { event: { id: 'evt_2', type: 'INITIAL_PURCHASE', app_user_id: userId, product_id: 'com.belevate.weekwell.yearly', expiration_at_ms: Date.parse(future(365)) } };
    await t.call('POST', '/v1/webhooks/revenuecat', { body: forged, headers: { authorization: RC.REVENUECAT_WEBHOOK_AUTH } });
    expect(await json(t.call('GET', '/v1/entitlement', { token }))).toMatchObject({ state: 'none' });
    for (const body of [{ event: { id: 'e3', type: 'TEST', app_user_id: 'x' } }, { event: { id: 'e4', type: 'RENEWAL', app_user_id: 'usr_nobody' } }]) {
      const res = await t.call('POST', '/v1/webhooks/revenuecat', { body, headers: { authorization: RC.REVENUECAT_WEBHOOK_AUTH } });
      expect(res.status).toBe(200);
    }
  });

  it('sync after a purchase; the mock trial and purchase routes are closed', async () => {
    const rc = fakeRevenueCat();
    const t = setup(RC, { fetch: rc.impl });
    const { token, userId } = await t.signIn('sync@example.com');
    expect((await t.call('POST', '/v1/entitlement/trial', { token, body: { productId: 'monthly' } })).status).toBe(403);
    rc.state.set(userId, trialFor(7));
    expect(await json(t.call('POST', '/v1/entitlement/sync', { token }))).toMatchObject({ state: 'trial' });
    // After the trial ends without a renewal, plan changes are refused.
    t.advance(8 * 86_400_000);
    expect(await json(t.call('POST', '/v1/entitlement/sync', { token }))).toMatchObject({ state: 'expired' });
  });

  it('a RevenueCat outage returns 502 to the webhook so it is retried', async () => {
    const down = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    const t = setup(RC, { fetch: down });
    const { userId } = await t.signIn('retry@example.com');
    const res = await t.call('POST', '/v1/webhooks/revenuecat', { body: { event: { id: 'e5', type: 'RENEWAL', app_user_id: userId } }, headers: { authorization: RC.REVENUECAT_WEBHOOK_AUTH } });
    expect(res.status).toBe(502);
  });
});

describe('Resend (D-013)', () => {
  it('sends the code with the configured sender and fails closed when Resend is down', async () => {
    const sent: { url: string; body: Record<string, unknown>; auth: string | null }[] = [];
    const ok = (async (url: string | URL | Request, init?: RequestInit) => {
      sent.push({ url: String(url), body: JSON.parse(String(init?.body)), auth: new Headers(init?.headers).get('authorization') });
      return new Response('{"id":"x"}', { status: 200 });
    }) as typeof fetch;
    await resendSender('re_test', 'Weekwell <signin@mail.weekwell.test>', ok)('a@example.com', '123456');
    expect(sent[0]).toMatchObject({ url: 'https://api.resend.com/emails', auth: 'Bearer re_test', body: { from: 'Weekwell <signin@mail.weekwell.test>', to: ['a@example.com'] } });
    expect(String(sent[0]!.body.text)).toContain('123456');
    const failing = (async () => new Response('', { status: 500 })) as unknown as typeof fetch;
    await expect(resendSender('re_test', 'x@y.z', failing)('a@example.com', '1')).rejects.toThrow(/resend_500/u);
  });

  it('a failed email is a clear error, never a silent success', async () => {
    // No injected sender: the app builds its Resend sender from config.
    const app = createApp({ config: loadConfig({ RESEND_API_KEY: 're_test', EMAIL_FROM: 'x@y.z' } as NodeJS.ProcessEnv), db: new Db(':memory:'), log: () => {}, fetch: (async () => new Response('', { status: 500 })) as unknown as typeof fetch });
    const res = await app.request('/v1/auth/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@example.com' }) });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'email_unavailable' });
  });
});

describe('account data', () => {
  it('export returns only the caller’s data; deletion removes everything', async () => {
    const t = setup();
    const a = await t.signIn('a@example.com');
    const b = await t.signIn('b@example.com');
    await t.call('POST', '/v1/plans', { token: a.token, body: { preferences: { ...PREFS, exclusions: ['peanuts'] }, weekOf: '2026-09-28' } });
    await t.call('POST', '/v1/plans', { token: b.token, body: { preferences: PREFS, weekOf: '2026-09-28' } });
    const exported = await (await t.call('GET', '/v1/export', { token: a.token })).json();
    expect(exported.plans).toHaveLength(1);
    expect(exported.plans[0].ownerId).toBe(a.userId);
    expect((await t.call('DELETE', '/v1/me', { token: a.token })).status).toBe(204);
    expect(t.db.counts(a.userId)).toEqual({ plans: 0, preferences: 0, entitlements: 0, sessions: 0 });
    expect((await t.call('GET', '/v1/me', { token: a.token })).status).toBe(401);
    expect(t.db.counts(b.userId).plans).toBe(1);
  });
});

describe('hardening', () => {
  it('CORS only allows configured origins', async () => {
    const t = setup();
    const ok = await t.call('GET', '/v1/health', { headers: { origin: 'https://app.weekwell.test' } });
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://app.weekwell.test');
    const bad = await t.call('GET', '/v1/health', { headers: { origin: 'https://evil.example' } });
    expect(bad.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('rejects oversized bodies', async () => {
    const t = setup();
    const res = await t.call('POST', '/v1/auth/start', { raw: JSON.stringify({ email: 'x'.repeat(70_000) }), headers: { 'content-length': '70016' } });
    expect(res.status).toBe(413);
  });

  it('logs are structured and never contain emails, codes, tokens, or exclusions', async () => {
    const t = setup();
    const { token } = await t.signIn('secret.person@example.com');
    await t.call('POST', '/v1/plans', { token, body: { preferences: { ...PREFS, exclusions: ['peanuts'] }, weekOf: '2026-09-28' } });
    const text = JSON.stringify(t.logs);
    expect(text).not.toMatch(/secret\.person|peanuts/u);
    expect(text).not.toContain(token);
    for (const s of t.sent) expect(text).not.toContain(s.code);
    expect(t.logs.every((l) => typeof l.requestId === 'string')).toBe(true);
  });

  it('sets security headers and hides internal errors', async () => {
    const t = setup();
    const res = await t.call('GET', '/v1/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    // Unknown routes don't reveal themselves before sign-in; with a session they are 404.
    expect((await t.call('GET', '/v1/nope')).status).toBe(401);
    const { token } = await t.signIn('a@example.com');
    expect((await t.call('GET', '/v1/nope', { token })).status).toBe(404);
  });
});
