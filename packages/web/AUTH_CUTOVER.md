# Production cutover: Neon Auth → self-hosted Better Auth

This branch migrates auth from the hosted **Neon Auth** service to
**self-hosted Better Auth** running inside the Next.js app (same Vercel deploy,
same Postgres — no new service). Dev branch is already migrated + verified.

**Chosen prod strategy: fresh start.** On cutover, prod also begins with empty
Better Auth tables. All current prod users must re-sign-up. No user-migration
code is included (per decision — pre-launch posture).

## What changes on deploy

The moment prod deploys this code, it stops reading the hosted Neon Auth service
and reads its own `public.user` / `session` / `account` / … tables instead.
Those tables are empty until the migration below is run, so **do the DB steps
before or immediately at deploy**, not after.

## Cutover checklist (prod)

1. **Create the Better Auth schema on the prod database**
   ```bash
   cd packages/web
   DATABASE_URL="<PROD_DATABASE_URL>" \
   BETTER_AUTH_SECRET="<prod-secret>" \
   npx @better-auth/cli@latest migrate --config lib/auth/server.ts --yes
   ```

2. **Wipe prod (fresh start)** — mirror the dev wipe, **preserving the token
   pool + service data**:
   ```sql
   BEGIN;
   DROP SCHEMA IF EXISTS neon_auth CASCADE;         -- old hosted-auth tables
   TRUNCATE subscriptions, brands, brand_assets,
            studio_documents, saved_badges, badge_stats_daily
     RESTART IDENTITY CASCADE;
   COMMIT;
   -- PRESERVE (do NOT touch): github_tokens, gen_counter, gen_users,
   --                          memo_badges, view_counts
   ```
   Snapshot the preserved tables first as a safety net.

3. **Set Vercel env vars (Production):**
   - `BETTER_AUTH_SECRET` — a fresh ≥32-char secret (`openssl rand -base64 32`)
   - `BETTER_AUTH_URL` = `https://shieldcn.dev`
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — the prod GitHub OAuth app
   - **Remove** the retired `NEON_AUTH_*` vars.

4. **GitHub OAuth app** — register the prod callback:
   `https://shieldcn.dev/api/auth/callback/github`

5. **Deploy** this branch to prod.

6. **Smoke test:** sign up (email + GitHub), sign in, create an org, confirm a
   Plus purchase gates correctly.

## Plus subscription note

Because prod auth is wiped, the old `subscriptions` rows go too — there is no
"migrate Pro → Plus" to run on a fresh start. If you instead keep prod
subscriptions (do NOT truncate that table), migrate any legacy Pro rows with:

```sql
UPDATE subscriptions SET plan = 'plus' WHERE plan = 'pro';
```

## Rollback

Revert the deploy to the previous commit (which uses `@neondatabase/auth`). The
hosted Neon Auth service + its `neon_auth` schema must still exist for rollback
to work — so **don't drop prod `neon_auth` until the Better Auth cutover is
confirmed stable.**
