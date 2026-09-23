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
  storeMode: 'mock' | 'store';
  production: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  const sessionSecret = env.SESSION_SECRET ?? '';
  const webhookSecret = env.WEBHOOK_SECRET ?? '';
  if (production && sessionSecret.length < 32) throw new Error('SESSION_SECRET must be set (32+ chars) in production');
  if (production && webhookSecret.length < 16) throw new Error('WEBHOOK_SECRET must be set in production');
  if (production && env.ALLOW_DEV_CODES === '1') throw new Error('ALLOW_DEV_CODES must not be enabled in production');
  const priceSource = (FIXTURE_PRICE_SCENARIOS as readonly string[]).includes(env.PRICE_SOURCE ?? '') ? (env.PRICE_SOURCE as FixturePriceScenario) : 'sample';
  return {
    port: Number(env.PORT ?? 8787),
    databasePath: env.DATABASE_PATH ?? ':memory:',
    // Development fallback is random per process, so dev sessions never survive a restart.
    sessionSecret: sessionSecret || crypto.randomUUID() + crypto.randomUUID(),
    webhookSecret: webhookSecret || 'dev-webhook-secret-not-for-production',
    corsOrigins: (env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    allowDevCodes: env.ALLOW_DEV_CODES === '1',
    priceSource,
    storeMode: env.STORE_MODE === 'store' ? 'store' : 'mock',
    production,
  };
}
