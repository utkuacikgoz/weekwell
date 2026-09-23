/**
 * Pilot storage on SQLite (node:sqlite). Every user-owned query is scoped by
 * owner id inside this module, so route code cannot forget it. The production
 * target is Postgres with row-level security (migrations/postgres), behind the
 * same method signatures.
 */
import { DatabaseSync } from 'node:sqlite';
import { PlanSchema, UserPreferencesSchema, type EntitlementRecord, type Plan, type UserPreferences } from '@weekwell/domain';

export type StoredPlan = { plan: Plan; checked: string[]; skipped: string[] };

export class Db {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email_hash TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS login_codes (email_hash TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS preferences (owner_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, json TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL, json TEXT NOT NULL, checked TEXT NOT NULL DEFAULT '[]', skipped TEXT NOT NULL DEFAULT '[]', is_current INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS plans_owner ON plans(owner_id, is_current);
      CREATE TABLE IF NOT EXISTS entitlements (owner_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY, received_at INTEGER NOT NULL);
    `);
  }

  // Users and sessions -------------------------------------------------------

  userByEmailHash(emailHash: string): string | undefined {
    const row = this.db.prepare('SELECT id FROM users WHERE email_hash = ?').get(emailHash) as { id: string } | undefined;
    return row?.id;
  }

  createUser(id: string, emailHash: string, now: Date): void {
    this.db.prepare('INSERT INTO users (id, email_hash, created_at) VALUES (?, ?, ?)').run(id, emailHash, now.toISOString());
  }

  userExists(id: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM users WHERE id = ?').get(id);
  }

  setLoginCode(emailHash: string, codeHash: string, expiresAt: number): void {
    this.db.prepare('INSERT INTO login_codes (email_hash, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0) ON CONFLICT(email_hash) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0').run(emailHash, codeHash, expiresAt);
  }

  loginCode(emailHash: string): { codeHash: string; expiresAt: number; attempts: number } | undefined {
    const row = this.db.prepare('SELECT code_hash, expires_at, attempts FROM login_codes WHERE email_hash = ?').get(emailHash) as { code_hash: string; expires_at: number; attempts: number } | undefined;
    return row ? { codeHash: row.code_hash, expiresAt: row.expires_at, attempts: row.attempts } : undefined;
  }

  bumpLoginAttempts(emailHash: string): void {
    this.db.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE email_hash = ?').run(emailHash);
  }

  deleteLoginCode(emailHash: string): void {
    this.db.prepare('DELETE FROM login_codes WHERE email_hash = ?').run(emailHash);
  }

  createSession(tokenHash: string, userId: string, expiresAt: number): void {
    this.db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, userId, expiresAt);
  }

  sessionUser(tokenHash: string, now: number): string | undefined {
    const row = this.db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(tokenHash) as { user_id: string; expires_at: number } | undefined;
    if (!row || row.expires_at < now) return undefined;
    return row.user_id;
  }

  deleteSession(tokenHash: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }

  // Owner-scoped data --------------------------------------------------------

  setPreferences(ownerId: string, prefs: UserPreferences, now: Date): void {
    this.db.prepare('INSERT INTO preferences (owner_id, json, updated_at) VALUES (?, ?, ?) ON CONFLICT(owner_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at').run(ownerId, JSON.stringify(prefs), now.toISOString());
  }

  preferences(ownerId: string): UserPreferences | undefined {
    const row = this.db.prepare('SELECT json FROM preferences WHERE owner_id = ?').get(ownerId) as { json: string } | undefined;
    return row ? UserPreferencesSchema.parse(JSON.parse(row.json)) : undefined;
  }

  /** Saves a plan as the owner's current plan. The plan's ownerId must match. */
  saveCurrentPlan(ownerId: string, plan: Plan): void {
    if (plan.ownerId !== ownerId) throw new Error('owner mismatch');
    this.db.exec('BEGIN');
    try {
      this.db.prepare('UPDATE plans SET is_current = 0 WHERE owner_id = ?').run(ownerId);
      this.db.prepare('INSERT INTO plans (id, owner_id, created_at, json, is_current) VALUES (?, ?, ?, ?, 1)').run(plan.id, ownerId, plan.createdAt, JSON.stringify(plan));
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  plan(ownerId: string, planId: string): StoredPlan | undefined {
    const row = this.db.prepare('SELECT json, checked, skipped FROM plans WHERE id = ? AND owner_id = ?').get(planId, ownerId) as { json: string; checked: string; skipped: string } | undefined;
    return row ? { plan: PlanSchema.parse(JSON.parse(row.json)), checked: JSON.parse(row.checked), skipped: JSON.parse(row.skipped) } : undefined;
  }

  currentPlan(ownerId: string): StoredPlan | undefined {
    const row = this.db.prepare('SELECT id FROM plans WHERE owner_id = ? AND is_current = 1').get(ownerId) as { id: string } | undefined;
    return row ? this.plan(ownerId, row.id) : undefined;
  }

  updatePlan(ownerId: string, plan: Plan, checked?: string[], skipped?: string[]): boolean {
    if (plan.ownerId !== ownerId) throw new Error('owner mismatch');
    const res = this.db
      .prepare('UPDATE plans SET json = ?, checked = COALESCE(?, checked), skipped = COALESCE(?, skipped) WHERE id = ? AND owner_id = ?')
      .run(JSON.stringify(plan), checked ? JSON.stringify(checked) : null, skipped ? JSON.stringify(skipped) : null, plan.id, ownerId);
    return Number(res.changes) === 1;
  }

  setListState(ownerId: string, planId: string, checked: string[], skipped: string[]): boolean {
    const res = this.db.prepare('UPDATE plans SET checked = ?, skipped = ? WHERE id = ? AND owner_id = ?').run(JSON.stringify(checked), JSON.stringify(skipped), planId, ownerId);
    return Number(res.changes) === 1;
  }

  plans(ownerId: string): Plan[] {
    const rows = this.db.prepare('SELECT json FROM plans WHERE owner_id = ? ORDER BY created_at').all(ownerId) as { json: string }[];
    return rows.map((r) => PlanSchema.parse(JSON.parse(r.json)));
  }

  entitlement(ownerId: string): EntitlementRecord | undefined {
    const row = this.db.prepare('SELECT json FROM entitlements WHERE owner_id = ?').get(ownerId) as { json: string } | undefined;
    return row ? (JSON.parse(row.json) as EntitlementRecord) : undefined;
  }

  setEntitlement(ownerId: string, record: EntitlementRecord): void {
    this.db.prepare('INSERT INTO entitlements (owner_id, json) VALUES (?, ?) ON CONFLICT(owner_id) DO UPDATE SET json = excluded.json').run(ownerId, JSON.stringify(record));
  }

  /** Replay protection for store webhooks: false if the event id was seen before. */
  markWebhookSeen(eventId: string, now: number): boolean {
    this.db.prepare('DELETE FROM webhook_events WHERE received_at < ?').run(now - 7 * 86_400_000);
    const res = this.db.prepare('INSERT OR IGNORE INTO webhook_events (id, received_at) VALUES (?, ?)').run(eventId, now);
    return Number(res.changes) === 1;
  }

  /** Account deletion: every user-owned row goes (cascades), then the user. */
  deleteUser(ownerId: string): void {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(ownerId);
  }

  counts(ownerId: string): Record<string, number> {
    const n = (sql: string) => (this.db.prepare(sql).get(ownerId) as { n: number }).n;
    return {
      plans: n('SELECT COUNT(*) AS n FROM plans WHERE owner_id = ?'),
      preferences: n('SELECT COUNT(*) AS n FROM preferences WHERE owner_id = ?'),
      entitlements: n('SELECT COUNT(*) AS n FROM entitlements WHERE owner_id = ?'),
      sessions: n('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?'),
    };
  }
}
