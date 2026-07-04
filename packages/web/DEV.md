# Local dev environment

A dev setup for testing DB-backed features (saved badges, saved READMEs, brands,
billing gates) **without touching production**.

## What's configured

Everything lives in `packages/web/.env.local` (gitignored — never committed):

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | A **Neon dev branch** — isolated from prod writes, seeded with prod-like data. Tables auto-create on first request via `initDB()`. |
| `DEV_PLAN` | Dev-only plan override (`plus` or `free`). Lets you exercise Plus-gated features without a real Polar subscription. |

Real Neon Auth is reused, so you sign in normally.

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

- The Neon dev-branch password was shared in plaintext during setup — **rotate
  it** in the Neon console.
- `DATABASE_URL` and `DEV_PLAN` must **never** be set on the production
  deployment (Vercel). They belong only in local `.env.local`.
