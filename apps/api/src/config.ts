/** Configuration from the environment. Fails closed on unsafe production settings. */
import { FIXTURE_PRICE_SCENARIOS, type FixturePriceScenario } from '@weekwell/domain';

export type Config = {
  port: number;
  databasePath: string;
  sessionSecret: string;
  webhookSecret: string;
  corsOrigins: string[];
  allowDevCodes: boolean;
  priceSource: FixturePriceScenario;
  /** mock: the app starts trials itself (dev). store: signed generic webhooks. revenuecat: RevenueCat (D-014). */
  storeMode: 'mock' | 'store' | 'revenuecat';
  revenuecatSecretKey: string;
  revenuecatWebhookAuth: string;
  /** Resend (D-013). Empty in development: codes are only shown with ALLOW_DEV_CODES. */
  resendApiKey: string;
  emailFrom: string;
  production: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  const sessionSecret = env.SESSION_SECRET ?? '';
  const webhookSecret = env.WEBHOOK_SECRET ?? '';
  if (production && sessionSecret.length < 32) throw new Error('SESSION_SECRET must be set (32+ chars) in production');
  if (production && webhookSecret.length < 16) throw new Error('WEBHOOK_SECRET must be set in production');
  if (production && env.ALLOW_DEV_CODES === '1') throw new Error('ALLOW_DEV_CODES must not be enabled in production');
  const storeMode = env.STORE_MODE === 'store' ? 'store' : env.STORE_MODE === 'revenuecat' ? 'revenuecat' : 'mock';
  const revenuecatSecretKey = env.REVENUECAT_SECRET_KEY ?? '';
  const revenuecatWebhookAuth = env.REVENUECAT_WEBHOOK_AUTH ?? '';
  if (storeMode === 'revenuecat' && (!revenuecatSecretKey || revenuecatWebhookAuth.length < 24)) {
    throw new Error('STORE_MODE=revenuecat needs REVENUECAT_SECRET_KEY and REVENUECAT_WEBHOOK_AUTH (24+ chars)');
  }
  if (production && storeMode === 'mock') throw new Error('STORE_MODE=mock must not be used in production');
  const resendApiKey = env.RESEND_API_KEY ?? '';
  const emailFrom = env.EMAIL_FROM ?? '';
  if (production && (!resendApiKey || !emailFrom)) throw new Error('RESEND_API_KEY and EMAIL_FROM must be set in production');
  const priceSource = (FIXTURE_PRICE_SCENARIOS as readonly string[]).includes(env.PRICE_SOURCE ?? '') ? (env.PRICE_SOURCE as FixturePriceScenario) : 'auto';
  return {
    port: Number(env.PORT ?? 8787),
    databasePath: env.DATABASE_PATH ?? ':memory:',
    // Development fallback is random per process, so dev sessions never survive a restart.
    sessionSecret: sessionSecret || crypto.randomUUID() + crypto.randomUUID(),
    webhookSecret: webhookSecret || 'dev-webhook-secret-not-for-production',
    corsOrigins: (env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    allowDevCodes: env.ALLOW_DEV_CODES === '1',
    priceSource,
    storeMode,
    revenuecatSecretKey,
    revenuecatWebhookAuth,
    resendApiKey,
    emailFrom,
    production,
  };
}
