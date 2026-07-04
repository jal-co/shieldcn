# Local dev environment

A dev setup for testing DB-backed features (saved badges, saved READMEs, brands,
billing gates) **without touching production**.

## What's configured

Everything lives in `packages/web/.env.local` (gitignored — never committed):

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | A **Neon dev branch** — isolated from prod writes, seeded with prod-like data. Tables auto-create on first request via `initDB()`. |
| `DEV_PLAN` | Dev-only plan override (`plus` or `free`). Lets you exercise Plus-gated features without a real Polar subscription. |
| `BETTER_AUTH_SECRET` | ≥32-char secret for Better Auth (session encryption). Generate with `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | Base URL Better Auth builds callback URLs from (`http://localhost:3000` in dev). |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app creds for social sign-in. Distinct from the token-pool's `GITHUB_OAUTH_*` / `GITHUB_TOKEN`. |

## Authentication (self-hosted Better Auth)

Auth is **self-hosted Better Auth** running inside this Next.js app against the
same Postgres — there is no separate auth service to deploy. Its tables
(`user`, `session`, `account`, `verification`, `organization`, `member`,
`invitation`) live in `public` alongside the app tables.

- Server instance: `lib/auth/server.ts` (`betterAuth({ database: getPool() })`).
- Client: `lib/auth/client.ts` (`better-auth/react` + `organizationClient`).
- Route: `app/api/auth/[...path]/route.ts` (`toNextJsHandler`).
- Session reads: `lib/auth.ts` `getSession()` → `auth.api.getSession({ headers })`.

Sign-in options: **email/password + GitHub OAuth**. Email/password works with no
OAuth creds; add `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` to enable social.

### Creating / updating the auth schema

Better Auth manages its own tables. To (re)create them on a fresh database:

```bash
cd packages/web
npx @better-auth/cli@latest migrate --config lib/auth/server.ts --yes
```

(Needs `DATABASE_URL` + `BETTER_AUTH_SECRET` in the environment. `migrate`
applies directly via the built-in Kysely adapter; use `generate` for SQL only.)

### GitHub OAuth callback URL

Register these in the GitHub OAuth app:

- Dev: `http://localhost:3000/api/auth/callback/github`
- Prod: `https://shieldcn.dev/api/auth/callback/github`

## Running it

```bash
# from repo root
pnpm dev:web            # https (experimental)
# or, plain http:
cd packages/web && pnpm dev:http
```

Then open http://localhost:3000 and sign in.

## The `DEV_PLAN` override

`getPlan()` in `packages/core/src/entitlements.ts` returns `DEV_PLAN` **only
when both** hold:

1. `NODE_ENV !== "production"`, and
2. `DEV_PLAN` is a valid plan (`"free"` | `"plus"`).

Both guards must pass, so it **cannot fire on a deployed production build** — a
prod server always runs `NODE_ENV=production`. Covered by tests in
`entitlements.test.ts` (including the "never fires in production" guarantee).

- `DEV_PLAN=plus` → test the 50-badge cap, brand editing, AI, mass migration.
- `DEV_PLAN=free` (or unset) → test the free path (2-badge cap) + upgrade nudges.

## Testing saved badges

1. `DEV_PLAN=plus`, sign in.
2. Landing badge builder → configure a badge → **Save badge**.
3. Studio → a badge row's inspector → **bookmark** to save, or **Insert saved
   badge** to drop one in.
4. Manage them at `/dashboard/badges`.

## ⚠️ Before sharing this branch / going live

- The Neon dev-branch password AND the GitHub OAuth client secret were shared in
  plaintext during setup — **rotate both** (Neon console + GitHub OAuth app).
- `DATABASE_URL` and `DEV_PLAN` must **never** be set on the production
  deployment (Vercel). They belong only in local `.env.local`.
- Production needs its own `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
  (`https://shieldcn.dev`), and GitHub OAuth creds set in Vercel, plus the
  Better Auth schema created on the prod database. See the cutover handoff.
