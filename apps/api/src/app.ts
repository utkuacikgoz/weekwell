/**
 * Weekwell pilot API (mobile workstream A4–A6).
 *
 * - Passwordless email codes → opaque session tokens (only hashes stored).
 * - Every user-owned read/write is scoped by owner id in the database layer;
 *   another user's plan reads as 404 so ids cannot be probed.
 * - Plan changes enforce the access policy server-side (canChangePlan).
 * - Generation is idempotent and rate limited; prices come only from a provider.
 * - Store webhooks are signature-verified and replay-protected. RevenueCat
 *   webhooks (D-014) only trigger a re-read of the customer from RevenueCat.
 * - Sign-in codes are emailed with Resend (D-013).
 * - Logs are structured and redacted: no emails, tokens, or exclusions.
 */
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import {
  FixtureRetailerProvider,
  ProductIdSchema,
  REPAIR_ACTIONS,
  UserPreferencesSchema,
  applyStoreEvent,
  buildGroceryList,
  canChangePlan,
  deriveEntitlement,
  emptyEntitlement,
  findReplacement,
  generateFixturePlan,
  generateUnderBudgetPlan,
  getRecipe,
  recordFromSubscriber,
  previewPreferenceChange,
  priceGroceryList,
  recipeFitsTime,
  recipeIsAllowed,
  reconcileChecks,
  replaceMeal,
  type EntitlementRecord,
  type RcSubscriberResponse,
  type Plan,
  type UserPreferences,
} from '@weekwell/domain';
import { GenerationJobService, RateLimiter, idempotencyKey, redact, verifyWebhook } from '@weekwell/domain/server';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { z } from 'zod';
import type { Config } from './config';
import type { Db } from './db';

export type Logger = (entry: Record<string, unknown>) => void;
export type EmailSender = (email: string, code: string) => Promise<void>;

export type Deps = {
  config: Config;
  db: Db;
  now?: () => Date;
  log?: Logger;
  sendEmail?: EmailSender;
  /** Outbound HTTP (Resend, RevenueCat). Injected in tests. */
  fetch?: typeof fetch;
};

const REVENUECAT_API = 'https://api.revenuecat.com/v1';
const RESEND_API = 'https://api.resend.com/emails';

/** Resend sender (D-013). Plain text plus minimal HTML; the code is the only personal data sent. */
export function resendSender(apiKey: string, from: string, fetchImpl: typeof fetch = fetch): EmailSender {
  return async (email, code) => {
    const res = await fetchImpl(RESEND_API, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `${code} is your Weekwell sign-in code`,
        text: `Your Weekwell sign-in code is ${code}. It expires in 10 minutes.\n\nIf you didn’t ask for this, you can ignore this email.`,
        html: `<p>Your Weekwell sign-in code is</p><p style="font-size:28px;font-weight:600;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you didn’t ask for this, you can ignore this email.</p>`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`resend_${res.status}`);
  };
}

type Env = { Variables: { userId: string; requestId: string } };

const SESSION_TTL_MS = 30 * 86_400_000;
const CODE_TTL_MS = 10 * 60_000;
const MAX_CODE_ATTEMPTS = 5;

const EmailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
const IdListSchema = z.array(z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/u)).max(200);

class ApiError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 503,
    readonly code: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

export function createApp(deps: Deps) {
  const { config, db } = deps;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? ((e) => console.log(JSON.stringify(e)));
  const fetchImpl = deps.fetch ?? fetch;
  const sendEmail: EmailSender =
    deps.sendEmail ??
    (config.resendApiKey && config.emailFrom
      ? resendSender(config.resendApiKey, config.emailFrom, fetchImpl)
      : async () => {
          // Development without Resend: codes are only available through ALLOW_DEV_CODES.
        });

  /** Re-read a customer from RevenueCat and store the result (D-014). The REST view is the source of truth. */
  const syncFromRevenueCat = async (ownerId: string) => {
    const res = await fetchImpl(`${REVENUECAT_API}/subscribers/${encodeURIComponent(ownerId)}`, {
      headers: { authorization: `Bearer ${config.revenuecatSecretKey}`, accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`revenuecat_${res.status}`);
    const json = (await res.json()) as RcSubscriberResponse;
    if (!json || typeof json !== 'object' || !json.subscriber) throw new Error('revenuecat_bad_body');
    db.setEntitlement(ownerId, recordFromSubscriber(ownerId, json, db.entitlement(ownerId) ?? null, now()));
  };

  const hmac = (value: string) => createHmac('sha256', config.sessionSecret).update(value).digest('hex');
  const ipLimiter = new RateLimiter({ maxPerWindow: 300, windowMs: 60_000 });
  const authIpLimiter = new RateLimiter({ maxPerWindow: 10, windowMs: 10 * 60_000 });
  const authEmailLimiter = new RateLimiter({ maxPerWindow: 3, windowMs: 10 * 60_000 });
  const jobs = new GenerationJobService(async (job) => {
    const pending = pendingGeneration.get(job.idempotencyKey);
    if (!pending) return { ok: false, code: 'provider_error', attempts: 0 };
    const res = generateFixturePlan(pending.prefs, { ownerId: job.ownerId, planId: `plan_${randomBytes(8).toString('hex')}`, now: now() });
    if (!res.ok) return { ok: false, code: 'exclusion_conflict', attempts: 1 };
    db.saveCurrentPlan(job.ownerId, res.plan);
    return { ok: true, plan: res.plan, attempts: 1 };
  });
  const pendingGeneration = new Map<string, { prefs: UserPreferences }>();

  const ipOf = (c: Context) => c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const entitlementOf = (ownerId: string): EntitlementRecord => db.entitlement(ownerId) ?? emptyEntitlement(ownerId, now());
  const viewOf = (ownerId: string) => deriveEntitlement(entitlementOf(ownerId), now());
  const requirePlanChanges = (ownerId: string) => {
    if (!canChangePlan(viewOf(ownerId))) throw new ApiError(403, 'subscription_required');
  };
  const ownedPlan = (ownerId: string, planId: string) => {
    const stored = db.plan(ownerId, planId);
    if (!stored) throw new ApiError(404, 'not_found');
    return stored;
  };
  const listItems = (plan: Plan, skipped: string[]) => buildGroceryList([...plan.dinners, ...plan.lunches].filter((m) => !skipped.includes(m.id)));
  const body = async <T>(c: Context, schema: z.ZodType<T>): Promise<T> => {
    let json: unknown;
    try {
      json = await c.req.json();
    } catch {
      throw new ApiError(400, 'invalid_json');
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new ApiError(400, 'invalid_request', { fields: parsed.error.issues.map((i) => i.path.join('.')) });
    return parsed.data;
  };

  const app = new Hono<Env>();

  // Cross-cutting middleware ------------------------------------------------
  app.use('*', async (c, next) => {
    const requestId = randomBytes(8).toString('hex');
    c.set('requestId', requestId);
    const started = Date.now();
    await next();
    c.header('x-request-id', requestId);
    log(redact({ at: now().toISOString(), requestId, method: c.req.method, route: c.req.routePath, status: c.res.status, ms: Date.now() - started }) as Record<string, unknown>);
  });
  app.use('*', secureHeaders());
  app.use('*', cors({ origin: (origin) => (config.corsOrigins.includes(origin) ? origin : null), allowHeaders: ['authorization', 'content-type', 'x-weekwell-signature'], allowMethods: ['GET', 'POST', 'PUT', 'DELETE'] }));
  app.use('*', bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: 'payload_too_large' }, 413) }));
  app.use('*', async (c, next) => {
    if (!ipLimiter.take(ipOf(c), now().getTime())) throw new ApiError(429, 'rate_limited');
    await next();
  });

  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json({ error: err.code, ...err.extra }, err.status);
    log(redact({ at: now().toISOString(), requestId: c.get('requestId'), level: 'error', error: err instanceof Error ? err.name : 'unknown' }) as Record<string, unknown>);
    return c.json({ error: 'server_error' }, 500);
  });
  app.notFound((c) => c.json({ error: 'not_found' }, 404));

  // Public routes -----------------------------------------------------------
  app.get('/v1/health', (c) => c.json({ ok: true }));

  app.post('/v1/auth/start', async (c) => {
    const { email } = await body(c, z.object({ email: EmailSchema }).strict());
    const emailHash = hmac(`email:${email}`);
    if (!authIpLimiter.take(ipOf(c), now().getTime()) || !authEmailLimiter.take(emailHash, now().getTime())) throw new ApiError(429, 'rate_limited');
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    db.setLoginCode(emailHash, hmac(`code:${emailHash}:${code}`), now().getTime() + CODE_TTL_MS);
    try {
      await sendEmail(email, code);
    } catch (e) {
      log(redact({ at: now().toISOString(), requestId: c.get('requestId'), level: 'error', msg: 'email_failed', error: e instanceof Error ? e.message : 'unknown' }) as Record<string, unknown>);
      throw new ApiError(503, 'email_unavailable');
    }
    // Same response whether or not the account exists (no enumeration).
    return c.json(config.allowDevCodes ? { sent: true, devCode: code } : { sent: true });
  });

  app.post('/v1/auth/verify', async (c) => {
    const { email, code } = await body(c, z.object({ email: EmailSchema, code: z.string().regex(/^\d{6}$/u) }).strict());
    const emailHash = hmac(`email:${email}`);
    const stored = db.loginCode(emailHash);
    if (!stored || stored.expiresAt < now().getTime() || stored.attempts >= MAX_CODE_ATTEMPTS) throw new ApiError(401, 'invalid_code');
    const given = Buffer.from(hmac(`code:${emailHash}:${code}`), 'hex');
    const expected = Buffer.from(stored.codeHash, 'hex');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      db.bumpLoginAttempts(emailHash);
      throw new ApiError(401, 'invalid_code');
    }
    db.deleteLoginCode(emailHash);
    let userId = db.userByEmailHash(emailHash);
    if (!userId) {
      userId = `u_${randomBytes(12).toString('hex')}`;
      db.createUser(userId, emailHash, now());
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = now().getTime() + SESSION_TTL_MS;
    db.createSession(hmac(`session:${token}`), userId, expiresAt);
    return c.json({ token, userId, expiresAt: new Date(expiresAt).toISOString() });
  });

  app.post('/v1/webhooks/store', async (c) => {
    const raw = await c.req.text();
    const result = verifyWebhook(raw, c.req.header('x-weekwell-signature'), config.webhookSecret, { markSeen: (id, _exp, at) => db.markWebhookSeen(id, at) }, now());
    if (!result.ok) return c.json({ error: result.reason }, result.status);
    const { ownerId, event } = result.webhook;
    if (!db.userExists(ownerId)) return c.json({ ok: true, ignored: 'unknown_user' });
    try {
      db.setEntitlement(ownerId, applyStoreEvent(entitlementOf(ownerId), event));
    } catch {
      return c.json({ error: 'invalid_transition' }, 409);
    }
    return c.json({ ok: true });
  });

  // RevenueCat (D-014). Auth is the exact header value configured in RevenueCat.
  // The body only names who changed: state always comes from the REST re-read,
  // so a forged, stale, or out-of-order event can't grant access.
  app.post('/v1/webhooks/revenuecat', async (c) => {
    if (config.storeMode !== 'revenuecat') return c.json({ error: 'not_found' }, 404);
    const given = Buffer.from(c.req.header('authorization') ?? '');
    const expected = Buffer.from(config.revenuecatWebhookAuth);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return c.json({ error: 'unauthorized' }, 401);
    const parsed = z
      .object({ event: z.object({ id: z.string().min(1).max(200), type: z.string().max(64), app_user_id: z.string().max(200).optional() }).passthrough() })
      .passthrough()
      .safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'bad_body' }, 400);
    const { id, type, app_user_id: ownerId } = parsed.data.event;
    if (type === 'TEST') return c.json({ ok: true, ignored: 'test' });
    if (!ownerId || !db.userExists(ownerId)) return c.json({ ok: true, ignored: 'unknown_user' });
    try {
      await syncFromRevenueCat(ownerId);
    } catch (e) {
      log(redact({ at: now().toISOString(), requestId: c.get('requestId'), level: 'error', msg: 'revenuecat_sync_failed', error: e instanceof Error ? e.message : 'unknown' }) as Record<string, unknown>);
      // RevenueCat retries non-2xx responses.
      return c.json({ error: 'sync_failed' }, 502);
    }
    // A repeat delivery just re-reads the same state (idempotent); the id is kept as a delivery record.
    db.markWebhookSeen(`rc:${id}`, now().getTime());
    return c.json({ ok: true });
  });

  // Authenticated routes ----------------------------------------------------
  const authed = new Hono<Env>();
  authed.use('*', async (c, next) => {
    const header = c.req.header('authorization') ?? '';
    const token = /^Bearer ([A-Za-z0-9_-]{20,100})$/u.exec(header)?.[1];
    const userId = token ? db.sessionUser(hmac(`session:${token}`), now().getTime()) : undefined;
    if (!userId) throw new ApiError(401, 'unauthorized');
    c.set('userId', userId);
    await next();
  });

  authed.post('/auth/logout', (c) => {
    const token = (c.req.header('authorization') ?? '').slice('Bearer '.length);
    db.deleteSession(hmac(`session:${token}`));
    return c.body(null, 204);
  });

  authed.get('/me', (c) => {
    const userId = c.get('userId');
    return c.json({ userId, preferences: db.preferences(userId) ?? null, entitlement: viewOf(userId) });
  });

  authed.put('/preferences', async (c) => {
    const prefs = await body(c, UserPreferencesSchema);
    db.setPreferences(c.get('userId'), prefs, now());
    return c.json({ preferences: prefs });
  });

  authed.post('/plans', async (c) => {
    const userId = c.get('userId');
    const { preferences, weekOf, requestKey } = await body(
      c,
      z.object({ preferences: UserPreferencesSchema, weekOf: z.iso.date(), requestKey: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/u).optional() }).strict(),
    );
    // The first plan is always allowed; after that, the access policy applies.
    if (db.currentPlan(userId)) requirePlanChanges(userId);
    db.setPreferences(userId, preferences, now());
    // A client-supplied key makes retries of one tap idempotent while a new tap makes a new week.
    const key = requestKey ?? idempotencyKey(userId, preferences, weekOf);
    pendingGeneration.set(key, { prefs: preferences });
    const job = await jobs.request(userId, ipOf(c), key, now());
    pendingGeneration.delete(key);
    if (job.state !== 'succeeded' || !job.planId) {
      if (job.errorCode === 'rate_limited') throw new ApiError(429, 'rate_limited');
      if (job.errorCode === 'exclusion_conflict') throw new ApiError(422, 'exclusion_conflict');
      throw new ApiError(422, job.errorCode ?? 'generation_failed');
    }
    const stored = ownedPlan(userId, job.planId);
    return c.json({ plan: stored.plan, checked: stored.checked, skipped: stored.skipped, job: { id: job.id, traceId: job.traceId, attempts: job.attempts } }, 201);
  });

  authed.get('/plans/current', (c) => {
    const stored = db.currentPlan(c.get('userId'));
    if (!stored) throw new ApiError(404, 'not_found');
    return c.json(stored);
  });

  authed.get('/plans/:id', (c) => c.json(ownedPlan(c.get('userId'), c.req.param('id'))));

  authed.put('/plans/:id/list', async (c) => {
    const userId = c.get('userId');
    const { checked, skipped } = await body(c, z.object({ checked: IdListSchema, skipped: IdListSchema }).strict());
    ownedPlan(userId, c.req.param('id'));
    db.setListState(userId, c.req.param('id'), checked, skipped);
    return c.json({ checked, skipped });
  });

  authed.post('/plans/:id/meals/:mealId/repair', async (c) => {
    const userId = c.get('userId');
    const { action } = await body(c, z.object({ action: z.enum(REPAIR_ACTIONS) }).strict());
    requirePlanChanges(userId);
    const stored = ownedPlan(userId, c.req.param('id'));
    const recipe = findReplacement(stored.plan, c.req.param('mealId'), action);
    if (!recipe) throw new ApiError(409, 'no_replacement');
    const res = replaceMeal(stored.plan, c.req.param('mealId'), recipe);
    const r = reconcileChecks(new Set(stored.checked), res.diff, listItems(res.plan, stored.skipped));
    db.updatePlan(userId, res.plan, [...r.checked]);
    return c.json({ plan: res.plan, checked: [...r.checked], previousRecipeId: res.previous.recipeId, changedItems: res.diff.added.length + res.diff.removed.length + res.diff.changed.length });
  });

  /** Put a specific recipe in a slot (used for Undo). Validated like any other change. */
  authed.put('/plans/:id/meals/:mealId', async (c) => {
    const userId = c.get('userId');
    const { recipeId } = await body(c, z.object({ recipeId: z.string().max(64) }).strict());
    const stored = ownedPlan(userId, c.req.param('id'));
    let recipe;
    try {
      recipe = getRecipe(recipeId);
    } catch {
      throw new ApiError(400, 'unknown_recipe');
    }
    const prefs = stored.plan.preferences;
    if (!recipeIsAllowed(recipe, prefs.exclusions) || !recipeFitsTime(recipe, prefs.maxMinutes)) throw new ApiError(422, 'recipe_not_allowed');
    let res;
    try {
      res = replaceMeal(stored.plan, c.req.param('mealId'), recipe);
    } catch {
      throw new ApiError(422, 'recipe_not_allowed');
    }
    const r = reconcileChecks(new Set(stored.checked), res.diff, listItems(res.plan, stored.skipped));
    db.updatePlan(userId, res.plan, [...r.checked]);
    return c.json({ plan: res.plan, checked: [...r.checked] });
  });

  authed.post('/plans/:id/rebuild-under-budget', (c) => {
    const userId = c.get('userId');
    requirePlanChanges(userId);
    const stored = ownedPlan(userId, c.req.param('id'));
    const res = generateUnderBudgetPlan(stored.plan.preferences, { ownerId: userId, planId: `plan_${randomBytes(8).toString('hex')}`, now: now() });
    if (!res.ok) throw new ApiError(422, 'exclusion_conflict');
    db.saveCurrentPlan(userId, res.plan);
    return c.json({ plan: res.plan, checked: [], skipped: [], estimatedCents: res.estimatedCents }, 201);
  });

  /** Apply new preferences with the minimal-change rules (same domain function the app previews with). */
  authed.post('/plans/:id/preferences', async (c) => {
    const userId = c.get('userId');
    const { preferences } = await body(c, z.object({ preferences: UserPreferencesSchema }).strict());
    const stored = ownedPlan(userId, c.req.param('id'));
    const preview = previewPreferenceChange(stored.plan, preferences, { ownerId: userId, planId: stored.plan.id, now: now() });
    if (preview.blocked) throw new ApiError(422, 'preferences_blocked', { message: preview.blocked });
    if (preview.mealsChanged.length > 0) requirePlanChanges(userId);
    const next = { ...preview.plan, id: `plan_${randomBytes(8).toString('hex')}`, createdAt: now().toISOString() };
    const r = reconcileChecks(new Set(stored.checked), preview.diff, listItems(next, []));
    db.setPreferences(userId, preferences, now());
    db.saveCurrentPlan(userId, next);
    db.setListState(userId, next.id, [...r.checked], []);
    return c.json({ plan: next, checked: [...r.checked], skipped: [], summary: preview.summary, mealsChanged: preview.mealsChanged.length }, 201);
  });

  /** Undo a whole-plan change: make an earlier plan (the caller's own) current again. */
  authed.post('/plans/:id/make-current', (c) => {
    const userId = c.get('userId');
    const stored = ownedPlan(userId, c.req.param('id'));
    db.makeCurrent(userId, stored.plan.id);
    return c.json(stored);
  });

  authed.get('/plans/:id/prices', async (c) => {
    const stored = ownedPlan(c.get('userId'), c.req.param('id'));
    const provider = new FixtureRetailerProvider(stored.plan.preferences.retailer, config.priceSource, now);
    const priced = await priceGroceryList(provider, listItems(stored.plan, stored.skipped), { now: now() });
    return c.json({ retailer: priced.retailer, checkedAt: priced.checkedAt, items: [...priced.items.entries()], total: priced.total });
  });

  authed.get('/entitlement', (c) => c.json(viewOf(c.get('userId'))));

  const mockStore = (c: Context) => {
    if (config.storeMode !== 'mock') throw new ApiError(403, 'store_managed');
    return c;
  };
  authed.post('/entitlement/trial', async (c) => {
    mockStore(c);
    const userId = c.get('userId');
    const { productId } = await body(c, z.object({ productId: ProductIdSchema }).strict());
    try {
      db.setEntitlement(userId, applyStoreEvent(entitlementOf(userId), { type: 'trial_started', productId, at: now().toISOString() }));
    } catch {
      throw new ApiError(409, 'trial_already_used');
    }
    return c.json(viewOf(userId));
  });
  authed.post('/entitlement/purchase', async (c) => {
    mockStore(c);
    const userId = c.get('userId');
    const { productId } = await body(c, z.object({ productId: ProductIdSchema }).strict());
    const days = productId === 'weekly' ? 7 : productId === 'monthly' ? 30 : 365;
    db.setEntitlement(userId, applyStoreEvent(entitlementOf(userId), { type: 'purchased', productId, at: now().toISOString(), periodEndsAt: new Date(now().getTime() + days * 86_400_000).toISOString() }));
    return c.json(viewOf(userId));
  });
  // After a purchase or restore in the app: re-read from RevenueCat now instead of waiting for the webhook.
  authed.post('/entitlement/sync', async (c) => {
    const userId = c.get('userId');
    if (config.storeMode === 'revenuecat') {
      try {
        await syncFromRevenueCat(userId);
      } catch {
        throw new ApiError(503, 'store_unavailable');
      }
    }
    return c.json(viewOf(userId));
  });
  authed.post('/entitlement/restore', (c) => {
    const view = viewOf(c.get('userId'));
    return c.json({ result: view.state === 'trial' || view.state === 'active' ? 'restored' : 'nothing_to_restore', entitlement: view });
  });

  authed.get('/export', (c) => {
    const userId = c.get('userId');
    return c.json({ exportedAt: now().toISOString(), preferences: db.preferences(userId) ?? null, plans: db.plans(userId), entitlement: viewOf(userId) });
  });

  authed.delete('/me', (c) => {
    db.deleteUser(c.get('userId'));
    return c.body(null, 204);
  });

  app.route('/v1', authed);
  return app;
}
