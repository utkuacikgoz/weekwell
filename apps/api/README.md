# Weekwell API (pilot)

Hono on Node 22. Pilot storage is SQLite (`node:sqlite`); the production target is Postgres with row-level security (`migrations/postgres/001_init.sql`, untested until D-013 is decided).

```bash
cp .env.example .env        # never commit .env
npm run dev                 # ALLOW_DEV_CODES=1: sign-in codes are returned in the response
npm test                    # 22 tests incl. cross-user access, webhook replay, deletion, log redaction
```

## Endpoints (`/v1`)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | public |
| POST | `/auth/start` `{email}` | emails a 6-digit code; same response whether or not the account exists; rate limited per IP and per email |
| POST | `/auth/verify` `{email, code}` | returns an opaque session token (30 days); 5 attempts per code; codes expire in 10 minutes |
| POST | `/auth/logout` | |
| GET | `/me` | preferences + entitlement view |
| PUT | `/preferences` | `UserPreferencesSchema` |
| POST | `/plans` `{preferences, weekOf, requestKey?}` | idempotent per request key; rate limited; first plan always allowed, later ones follow the access policy |
| GET | `/plans/current`, `/plans/:id` | owner-scoped; other users' plans are 404 |
| PUT | `/plans/:id/list` `{checked, skipped}` | grocery state |
| POST | `/plans/:id/meals/:mealId/repair` `{action}` | swap / cheaper / more_protein / faster; access policy |
| PUT | `/plans/:id/meals/:mealId` `{recipeId}` | set a specific recipe (Undo); validated against exclusions and time |
| POST | `/plans/:id/rebuild-under-budget` | access policy |
| GET | `/plans/:id/prices` | provider prices; total withheld unless complete |
| GET | `/entitlement` | view from server time |
| POST | `/entitlement/trial`, `/entitlement/purchase` | `STORE_MODE=mock` only; in `store` mode only verified webhooks change entitlements |
| POST | `/entitlement/restore` | |
| POST | `/webhooks/store` | HMAC signature (`x-weekwell-signature`), 5-minute tolerance, replay protection |
| GET | `/export` | the caller's data only |
| DELETE | `/me` | deletes the account and every owned row |

## Email and subscriptions

- **Sign-in email (D-013):** sent with Resend. Set `RESEND_API_KEY` and `EMAIL_FROM` (an address on a domain verified in Resend, with SPF and DKIM set up as Resend shows). Production refuses to start without them. If Resend fails, `/v1/auth/start` returns `503 email_unavailable`.
- **Subscriptions (D-014):** `STORE_MODE=revenuecat` with `REVENUECAT_SECRET_KEY` and `REVENUECAT_WEBHOOK_AUTH`. `POST /v1/webhooks/revenuecat` checks the Authorization header, then re-reads the customer from RevenueCat. `POST /v1/entitlement/sync` does the same for the signed-in user right after a purchase. Setup: `apps/mobile/docs/release/revenuecat-setup.md`.

## Security notes

- Emails, login codes, and session tokens are stored only as HMACs keyed by `SESSION_SECRET`.
- Logs are one JSON line per request (request id, route, status, ms) and go through `redact`.
- CORS allowlist (`CORS_ORIGINS`), security headers, 64 KB body limit, 300 requests/min per IP.
- Production refuses to start without `SESSION_SECRET` and `WEBHOOK_SECRET`, or with `ALLOW_DEV_CODES=1`.
- No email provider is configured (D-013). Without `ALLOW_DEV_CODES`, codes are not delivered anywhere.
- Generation jobs are in memory (one process). A durable queue is needed before running more than one instance.
