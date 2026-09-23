-- Weekwell production schema (Postgres) with row-level security.
-- UNTESTED against a live database: written for the D-013 decision (Supabase or
-- plain Postgres). Mirrors the pilot SQLite schema in src/db.ts. The API sets
--   SET LOCAL app.user_id = '<authenticated user id>'
-- at the start of each request transaction; policies read it. On Supabase,
-- replace current_setting('app.user_id') with auth.uid()::text.

CREATE TABLE users (
  id          text PRIMARY KEY,
  email_hash  text UNIQUE NOT NULL,          -- HMAC of the normalized email; the email itself is not stored
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE login_codes (
  email_hash  text PRIMARY KEY,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    int NOT NULL DEFAULT 0
);

CREATE TABLE sessions (
  token_hash  text PRIMARY KEY,              -- HMAC of the opaque token; the token itself is never stored
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL
);

CREATE TABLE preferences (
  owner_id    text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  json        jsonb NOT NULL,                 -- includes exclusions (health-adjacent): deleted with the account
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plans (
  id          text PRIMARY KEY,
  owner_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL,
  json        jsonb NOT NULL,
  checked     jsonb NOT NULL DEFAULT '[]',
  skipped     jsonb NOT NULL DEFAULT '[]',
  is_current  boolean NOT NULL DEFAULT false
);
CREATE INDEX plans_owner ON plans(owner_id, is_current);
CREATE UNIQUE INDEX plans_one_current ON plans(owner_id) WHERE is_current;

CREATE TABLE entitlements (
  owner_id    text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  json        jsonb NOT NULL
);

CREATE TABLE webhook_events (
  id          text PRIMARY KEY,               -- replay protection: unique event ids
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Row-level security: a request can only see rows it owns.
ALTER TABLE preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences  FORCE ROW LEVEL SECURITY;
ALTER TABLE plans        FORCE ROW LEVEL SECURITY;
ALTER TABLE entitlements FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions     FORCE ROW LEVEL SECURITY;

CREATE POLICY own_preferences  ON preferences  USING (owner_id = current_setting('app.user_id', true)) WITH CHECK (owner_id = current_setting('app.user_id', true));
CREATE POLICY own_plans        ON plans        USING (owner_id = current_setting('app.user_id', true)) WITH CHECK (owner_id = current_setting('app.user_id', true));
CREATE POLICY own_entitlements ON entitlements USING (owner_id = current_setting('app.user_id', true)) WITH CHECK (owner_id = current_setting('app.user_id', true));
CREATE POLICY own_sessions     ON sessions     USING (user_id = current_setting('app.user_id', true));

-- The API connects as a non-owner role so policies apply. Sign-in and webhook
-- handlers use a separate, narrowly granted role for users/login_codes/webhook_events
-- and for entitlement writes from verified store events.
