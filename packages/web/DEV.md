# Local dev environment

A dev setup for the DB-backed brand-management surface (admin-only) **without
touching production**.

## What's configured

Everything lives in `packages/web/.env.local` (gitignored — never committed):

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | A **Neon dev branch** — isolated from prod writes. Tables auto-create on first request via `initDB()`. |
| `BETTER_AUTH_SECRET` | ≥32-char secret for Better Auth (session encryption). Generate with `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | Base URL Better Auth builds callback URLs from (`http://localhost:3000` in dev). |
| `ADMIN_EMAILS` / `ADMIN_USER_IDS` | Comma-separated allowlist. Only these accounts can reach `/dashboard` and manage brands. |
| `CONTEXT_DEV_API_KEY` | Optional — enables brand import from a domain. |

## Authentication (minimal, admin-only)

shieldcn has **no user accounts or paid tiers**. Auth exists solely so the site
admin can sign in and manage brands. It's a **minimal self-hosted Better Auth**
(email/password only — no OAuth, organizations, or billing) running inside this
Next.js app against the same Postgres. Its tables (`user`, `session`,
`account`, `verification`) live in `public` alongside the app tables.

- Server instance: `lib/auth/server.ts` (`betterAuth({ database: getPool() })`, `disableSignUp: true`).
- Client: `lib/auth/client.ts` (`better-auth/react`).
- Route: `app/api/auth/[...path]/route.ts` (`toNextJsHandler`).
- Session reads: `lib/auth.ts` `getSession()`.
- Admin gate: `lib/admin.ts` (`ADMIN_EMAILS` / `ADMIN_USER_IDS` allowlist).

Sign-in lives at the **unlinked** `/brandmgmt` route (excluded from the sitemap,
`noindex`). There is no public registration.

### Creating the auth schema + the admin account

Better Auth manages its own tables. On a fresh database:

```bash
cd packages/web
npx @better-auth/cli@latest migrate --config lib/auth/server.ts --yes
```

Because public sign-up is disabled, create the single admin user out-of-band —
either temporarily flip `disableSignUp` off, register once at `/brandmgmt`, then
turn it back on; or insert the `user` + `account` rows directly. Add that user's
email to `ADMIN_EMAILS`.

## Running it

```bash
# from repo root
pnpm dev:web            # https (experimental)
# or, plain http:
cd packages/web && pnpm dev:http
```

Then open http://localhost:3000. Manage brands at `/brandmgmt` → `/dashboard`.

## ⚠️ Before sharing this branch / going live

- Rotate any credentials shared in plaintext during setup (Neon console, etc.).
- `DATABASE_URL` must never point at production from local `.env.local`.
- Production needs its own `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
  (`https://shieldcn.dev`), and `ADMIN_EMAILS` set in Vercel, plus the Better
  Auth schema created on the prod database.
