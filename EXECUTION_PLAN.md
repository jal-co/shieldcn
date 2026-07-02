# shieldcn — Execution Plan

> Turns the backlog in [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) into a sequenced,
> PR-sized delivery plan. Item IDs (`B1`, `F2`, `P11`, …) map 1:1 to that
> document. Each work unit below is one reviewable PR: scope, files, verification,
> and risk. Re-verify file:line refs before editing — they may have drifted.

---

## Guiding principles

1. **CI before code.** No behavioral change lands until a workflow actually runs
   the existing tests. Phase 0 is non-negotiable and blocks nothing downstream
   from being trusted.
2. **One concern per PR.** Security fixes stay isolated from refactors so each is
   independently reviewable and revertable.
3. **Fix shared surfaces once.** Where the audit found the same defect in two
   places (rate limiting, fetch hardening, route glue), the plan merges them into
   a single PR rather than repeating the fix per package.
4. **Land the safety fixes before the cleanups.** P0 security → P1 reliability/
   a11y → tests → P2 hygiene. Hygiene refactors ride on top of test coverage, not
   under it.
5. **Keep each PR green.** Every unit lists its verification step; a PR is not
   done until `turbo build lint` + `vitest run` pass in CI.

---

## Critical path & dependencies

```
Phase 0 ──► (everything else can be trusted)
   │
   ├─ PR-0.1 CI workflow (B12)         ◄── hard prerequisite for all later PRs
   ├─ PR-0.2 commit-rule drift (P11)
   └─ PR-0.3 dependabot (P13)

Phase 1 (security) ── depends only on Phase 0
   ├─ PR-1.1 fetch hardening (B1 + B4 + B14)     [shared fetch call sites]
   ├─ PR-1.2 crypto + db TLS (B2 + B3) + docs (P15)
   ├─ PR-1.3 rate limiting (B7 + F1)             [one shared limiter]
   ├─ PR-1.4 memo + PUT hardening (B5 + B6)
   ├─ PR-1.5 group caps + svg-parser (B8 + B9)
   └─ PR-1.6 engine ops (B10 + B11 + B21)

Phase 2 (reliability/perf) ── depends on Phase 0; PR-2.x independent of each other
Phase 3 (frontend a11y/ux)  ── depends on Phase 0; independent of Phase 2
Phase 4 (tests)             ── B20/B22 easier after Phase 1–2 stabilize; F6 anytime
Phase 5 (hygiene)           ── P5/P8 ride on Phase 4 coverage; rest anytime
```

**Two parallel tracks after Phase 0:** a *backend track* (Phases 1 → 2 → 4-core)
and a *frontend track* (Phase 3 → 4-web). They share only PR-1.3 (rate limiting
touches both web and engine) — coordinate that one, then the tracks are
independent and can be worked by two agents concurrently.

---

## Phase 0 — Foundation (safety net)

Land all three first. Small, low-risk, unblocks trust in every later change.

### PR-0.1 — CI: tests, typecheck, lint, builds  · items: **B12** · effort S
- **Do:** add `.github/workflows/ci.yml` triggered on PR + push to main:
  `pnpm install --frozen-lockfile`, `pnpm turbo build lint`, `vitest run` in
  `packages/core`, `tsc --noEmit` in `packages/cli` and `packages/engine`. Add
  `test` and `typecheck` tasks to `turbo.json`. Add `lint`/`typecheck` scripts to
  `packages/engine` (root `lint-staged` covers only `packages/web/**`).
- **Verify:** open the PR against itself — CI must run and pass on current `main`.
- **Risk:** may surface pre-existing type/lint failures. If so, fix them in this
  PR (or a fast follow) so the branch is green.
- **Actual outcome:** build/test/typecheck were clean once `@types/node` was
  added to `packages/cli` (missing devDependency was causing cascading
  `process`/`node:*` type errors). `pnpm lint` surfaced 17 pre-existing errors
  in `packages/web` unrelated to this change (React Compiler effect-timing
  issues, `<a>` vs `next/link`) — too large and behavior-sensitive to fix
  blind inside a CI-setup PR. Shipped the Lint step as `continue-on-error:
  true` with a comment pointing at the tracked follow-up (**P17**, added
  below) rather than silently weakening the gate or blocking this PR on an
  unrelated fix.

### PR-0.2 — Align commit/branch rules  · items: **P11** · effort S
- **Do:** reconcile `.husky/commit-msg`, `.husky/pre-push`, and `commit-check.toml`
  so allowed commit types (`perf`, `build`, `revert`) and branch prefixes match.
- **Verify:** a `perf:`-prefixed commit passes both the local hook and CI lint.

### PR-0.3 — Dependabot  · items: **P13** · effort S
- **Do:** add `.github/dependabot.yml` for npm (workspace root), github-actions,
  and docker. Note the seven manual `pnpm.overrides` in root `package.json` as
  candidates to retire once upstream patches land.
- **Verify:** Dependabot config validates (GitHub shows it under Insights).

---

## Phase 1 — Security & correctness (P0)

Backend-heavy. Each PR is independently revertable. Do PR-1.1 and PR-1.3 first —
they close the widest-reaching holes.

### PR-1.1 — Harden user-controlled fetches  · items: **B1 + B4 + B14** · effort M
- **Do:** introduce one `safeFetch(url, opts)` helper in core (deny RFC1918 /
  link-local / loopback / cloud-metadata IPs, cap redirects, enforce byte-size
  limit, reuse the existing 4 MB header pattern). Route it through `cachedFetch`
  with backoff/budget. Apply at every user-URL call site: `providers/badge.ts:168`,
  `route-handler.ts:1490` (`/https`), `:3070` (chart `?url=`), `:2085`/`:2166`
  (header logo/image), and the instance-host providers (`discourse`, `mastodon`,
  `lemmy`, `matrix`, `weblate`, `sonar`).
- **Verify:** unit tests asserting rejection of `http://169.254.169.254`,
  `http://localhost`, `http://10.0.0.1`, oversized bodies, and >N redirects; a
  legitimate public JSON endpoint still renders.
- **Risk:** could break a self-hoster fetching an internal endpoint on purpose —
  gate the private-IP denial behind an `ALLOW_PRIVATE_FETCH` env for engine.
- **Actual outcome:** shipped as `packages/core/src/safe-fetch.ts` — a new
  `safeFetch()`/`assertPublicUrl()` pair with 21 unit tests (`safe-fetch.test.ts`).
  Wired in three ways: (1) `providerFetch`/`providerFetchText` gained an opt-in
  `userControlledHost` flag so the 6 instance-host providers route through it
  while the other ~43 trusted-host providers are byte-for-byte unchanged; (2)
  the dynamic JSON badge (`providers/badge.ts`) now also runs through
  `cachedFetchStale` (freshTtl 300s / staleTtl 1 day / errorTtl 60s) instead of
  a raw uncached `fetch`, closing B14 for that path; (3) the `/https` proxy now
  runs through `cachedFetch` for the same reason; chart `?url=` and header
  `?logo=`/`?image=` got `safeFetch` + (for header) an explicit `maxBytes` cap
  but were left on their existing `next: revalidate` caching since B14 only
  named the dynamic/https paths. Added the `SHIELDCN_ALLOW_PRIVATE_FETCH` env
  escape hatch called out in Risk above, documented in
  `packages/engine/README.md`. Left `inlineAvatar` and the flag/NBA logo
  fetches in `route-handler.ts` on raw `fetch` — their URLs come from trusted
  upstream API responses (GitHub avatars, hardcoded flag/NBA CDNs), not directly
  from the requester, so they're out of this PR's scope. Also discovered
  `packages/core` had a `tsconfig.json` but no wired `typecheck` script (so
  nothing had been type-checking it in CI) — added one, now included in
  Phase 0's `pnpm typecheck`.

### PR-1.2 — Crypto & DB TLS hardening  · items: **B2 + B3** + docs **P15** · effort M
- **Do:** add explicit `TOKEN_ENCRYPTION_KEY`; fail loudly in production when no
  real key is set instead of the `"shieldcn-dev-key"` fallback
  (`token-pool.ts:85-88`). Remove `rejectUnauthorized: false` (`db.ts:38`); use
  `sslmode=require` with system CAs. Update engine README env table (add
  `NEXT_PUBLIC_SENTRY_DSN`, document OAuth endpoints, `/api/gen-count`, the
  encryption-key requirement, and a "change the default postgres password" note).
- **Verify:** engine boots and connects to Neon/Railway/Supabase with verified
  TLS; missing key in `NODE_ENV=production` aborts startup with a clear message.
- **Risk:** existing deployments relying on the fallback key will need to set the
  env and re-donate tokens — call this out in the PR description as a breaking op.
- **Actual outcome:** `getEncryptionKey()` in `token-pool.ts` now checks
  `TOKEN_ENCRYPTION_KEY` first, then `GITHUB_OAUTH_CLIENT_SECRET` (unchanged
  precedent for existing deployments), then in `NODE_ENV=production` logs a
  `console.error` with an actionable message and throws — callers (`addToken`
  via the OAuth callback route, already wrapped in try/catch) surface it as a
  clean `db_store_failed` 500 rather than crashing. Outside production it
  falls back to `GITHUB_TOKEN` or a fixed dev key, unchanged, so local dev
  needs no setup. `encryptToken`/`decryptToken` were exported (previously
  module-private) specifically so this could be unit tested without mocking
  the DB layer — `token-pool.test.ts`, 6 tests covering round-trip, key
  precedence, and the production fail path. `db.ts` now uses `ssl: true`
  instead of `{ rejectUnauthorized: false }` for Neon/Railway/Supabase/
  `sslmode=require` connections, restoring real certificate verification; a
  comment points self-hosters with a private CA at `NODE_EXTRA_CA_CERTS`
  instead of disabling verification. Updated the engine README's env table for
  both `TOKEN_ENCRYPTION_KEY` and (from PR-1.1) `SHIELDCN_ALLOW_PRIVATE_FETCH`;
  did not do the full P15 sweep (Sentry DSN doc, OAuth endpoint docs, default
  postgres password note) — left that for its own pass since it's unrelated to
  the crypto/TLS change.

### PR-1.3 — Shared rate limiter  · items: **B7 + F1** · effort M
- **Do:** one limiter module (Redis/Upstash-backed on web where it's already
  wired; in-memory token bucket on engine). Apply to `POST /api/gen-count` (cap
  the `count` payload too), `PUT /memo/...`, PNG/GIF render paths, and the
  PR-creating routes `app/api/showcase/route.ts` + `app/api/migrate/pr/route.ts`.
- **Verify:** tests asserting 429 after threshold per IP; PR endpoints reject
  bursts; a normal single request succeeds.
- **Risk:** tune thresholds generously; badges are embedded and re-requested
  often. Start permissive, log near-limit hits.
- **Actual outcome:** shipped `packages/core/src/rate-limit.ts` —
  `checkRateLimit(bucket, identifier, {max, windowMs})` (fixed-window; Redis
  via the same Upstash env vars as the badge cache when configured, in-memory
  per-process fallback otherwise) and `getClientIdentifier(request)` (parses
  `x-forwarded-for`/`x-real-ip`). 9 unit tests, exercising the in-memory path
  (no Upstash env in test/CI). Deliberately did **not** touch the PNG/GIF
  badge-rendering GET hot path — that's the core product (READMEs embed and
  re-request it constantly, and it's already CDN/cache-fronted); B7's mention
  of render cost was read as rationale for guarding the *write* paths, not a
  directive to throttle badge views. Applied to: `handleBadgePUT` (memo, 20/min
  per IP, `route-handler.ts`), `gen-count` POST in both web and engine (30/min
  per IP + capped `count` at 100 — previously totally uncapped), and the two
  PR-creating routes `showcase` and `migrate/pr` (5/hour per IP each). All
  return 429 with a `Retry-After` header except `gen-count`, which keeps its
  existing fail-silent `{ok: true}` shape (it's a best-effort counter the
  client already ignores failures on) but with a 429 status so it's visible in
  logs/metrics.

### PR-1.4 — Memo + PUT hardening  · items: **B5 + B6** · effort S
- **Do:** wrap `handleBadgePUT` in try/catch; guard `decodeURIComponent`
  (`route-handler.ts:3795`) against `URIError`; add length limits on
  key/label/value. In `providers/memo.ts`: update `token_hash` on `ON CONFLICT`,
  collapse check-then-write into one conditional upsert
  (`WHERE token_hash = $n OR expires_at < NOW()`), make the cleanup DELETE
  probabilistic, and stop leaking `String(e)` in responses.
- **Verify:** tests for malformed `%` key → clean 400 (not 500), expiry-takeover
  by a new token succeeds, over-length input rejected.
- **Actual outcome:** `route-handler.ts`'s `handleBadgePUT` now guards
  `decodeURIComponent` (400 on `URIError` instead of an unhandled 500), caps
  the memo key at 200 chars and label/value/color at 100 each, and drops the
  dead outer try/catch around `upsertMemoBadge` (that function already never
  throws — it catches internally). `providers/memo.ts`'s check-then-write
  became one atomic `INSERT ... ON CONFLICT (key) DO UPDATE ... WHERE
  token_hash = EXCLUDED.token_hash OR expires_at < NOW() RETURNING key`,
  fixing both the TOCTOU race and the `token_hash`-never-updated-on-takeover
  bug in one change (zero `RETURNING` rows == blocked); the cleanup `DELETE`
  is now probabilistic (2%, matching `token-pool.ts`'s pattern) instead of
  running on every GET; and the catch-all now returns a fixed string instead
  of `String(e)`. Verified the DB-level fix for real: spun up a local
  Postgres 16 in this sandbox and wrote `providers/memo.test.ts` as a real
  integration suite (`describe.skipIf(!DATABASE_URL)`, so it's skipped — not
  faked — in the current CI which doesn't provision Postgres) that
  specifically exercises the expired-takeover scenario the bug affected: the
  new owner's *second* write must succeed against the *new* token_hash. Also
  added `badges/memo-route.test.ts` (7 tests, no DB needed) for the
  route-level validation — length caps, malformed encoding, and confirms the
  PR-1.3 rate limit 429s. Provisioning a Postgres service in CI so
  `memo.test.ts` actually runs there is left for Phase 4 (B20) rather than
  expanding this fix's scope.

### PR-1.5 — Group caps + SVG sanitization  · items: **B8 + B9** · effort S
- **Do:** cap `/group` at ~10 segments (`route-handler.ts:1642`) and validate its
  style via `resolveVariant` instead of `as BadgeStyle` (:1668). Audit
  `svg-parser.ts` to confirm only path/shape elements survive and `on*`/`href`/
  `style` attributes are stripped; lock it with tests.
- **Verify:** 11-segment group returns a clean error badge; a data-URI SVG with an
  `onload` attribute renders with the attribute removed.
- **Actual outcome:** capped `/group` at 10 segments (both SVG and JSON
  formats — the JSON branch also fans out one upstream fetch per segment via
  `Promise.all`, so it needed the same guard) and swapped the unchecked `style
  as BadgeStyle` cast for `resolveVariant()`, validated against the group's
  first segment as a representative provider (style is applied uniformly
  across the whole group). `badges/group-route.test.ts` (5 tests) locks in the
  boundary (10 OK, 11 rejected, both formats) and the style coercion — using
  the static `badge/` provider so it needs no network. One test-writing
  lesson worth recording: badge SVGs render text as Satori-generated glyph
  *paths*, not literal strings, so asserting on raw SVG text content doesn't
  work — the tests instead assert on the `Cache-Control` max-age (60s error
  TTL vs 3600s success TTL), which reliably distinguishes the error-badge path
  from a real render.
  For `svg-parser.ts`: read through the full extraction implementation and
  confirmed it's an *allowlist* extractor — it only ever pulls specific named
  attributes (`d`, `cx`/`cy`/`r`, `x`/`y`/`width`/`height`, etc.) off specific
  known elements via targeted regexes, then re-synthesizes new path strings
  from validated numbers; it never copies an element or its attribute set
  through verbatim, so there was no attribute-passthrough bug to fix. Traced
  how the extracted data actually reaches output (`render.tsx:738-739` passes
  `d`/`viewBox` as real JSX props into Satori, not string-concatenated
  markup) to confirm the rendering side can't reintroduce an injection either.
  Added `badges/svg-parser.test.ts` (19 tests) as a regression lock, not a
  bug fix: `onload`/`onclick` handlers, `<script>`, `<foreignObject>`,
  `href`/`javascript:` URIs, `style`/CSS injection, and quote-breakout
  attempts in a `d` value all verified to never reach the extracted icon
  data.

### PR-1.6 — Engine ops correctness  · items: **B10 + B11 + B21** · effort S
- **Do:** fix `docker-publish.yml` dispatch tagging (guard `latest` to tag refs /
  take version as input). Make `/api/health` ping the DB and return 503 when
  down. Add register-time env validation in engine `instrumentation.ts`
  (`DATABASE_URL` required; warn on OAuth half-config).
- **Verify:** health returns 503 with DB stopped; dispatch from a branch no longer
  clobbers `engine:latest`; engine logs a clear error when `DATABASE_URL` is unset.
- **Actual outcome:** `docker-publish.yml`'s `workflow_dispatch` now requires a
  `version` input; `latest` is only ever added to the tag list when
  `github.ref_type == 'tag'` (a real `engine@*` push), so a manual dispatch
  from a branch can no longer clobber it. `/api/health` now runs
  `query("SELECT 1")` before reporting status, returning `{ok:false,
  db:"down"}` with HTTP 503 on failure — verified against real Postgres in
  this sandbox both ways (started the actual `next start` server against a
  live DB → 200/ok, then against an unreachable one → 503/down), which also
  confirmed the fix is wired correctly with the existing `docker-compose.yml`
  healthcheck (`wget --spider`, which fails on any non-2xx). Added
  `validateEnv()` to `instrumentation.ts`, called from `register()` on the
  nodejs runtime: warns (not throws — the engine can still serve
  static/dynamic badges without a DB, so a hard crash would be
  disproportionate) when `DATABASE_URL` is unset or exactly one of the two
  `GITHUB_OAUTH_CLIENT_*` vars is set; also verified live by booting the
  server with `DATABASE_URL` unset and confirming the warning appears.

---

## Phase 2 — Reliability & performance (P1, backend)

Independent PRs; safe to parallelize. Sequence by impact: PR-2.1 and PR-2.2 are
hot-path wins.

### PR-2.1 — Single memoized resvg init + pinned wasm  · items: **B15** · effort S
- Extract `ensureResvg()` (memoized) replacing the 5 duplicated init blocks
  (`route-handler.ts:1807, 2005, 2203, 2817, 3722`); pin the CDN fallback to the
  installed `@resvg/resvg-wasm` version. **Verify:** PNG/GIF endpoints still
  render; no repeated `fs` reads under load (spot-check with a log/counter).
- **Actual outcome:** `ensureResvg()` memoizes the wasm module behind a single
  module-level promise, so concurrent/subsequent calls reuse it instead of
  redoing `fs.existsSync`/`readFileSync` or re-fetching the CDN wasm per
  request. Two of the five call sites (both header PNG paths) turned out to
  be functionally identical to the existing `rasterizeToPng()` helper, so
  they now just call it directly instead of duplicating the font-setup logic
  too — net reduction is more than the raw init-block dedup alone. Pinned the
  CDN fallback to `2.6.2` (the exact installed version) with a comment to
  keep it in sync. No existing test exercised the PNG path at all — added
  `badges/png-route.test.ts` (3 tests, `NODE_ENV=production` to force the
  local-file path so it doesn't depend on network access to unpkg.com, which
  is blocked by this sandbox's egress policy and would have made the
  CDN-fallback branch untestable here anyway) verifying real PNG magic bytes
  out of both the plain `ensureResvg()` path and the `rasterizeToPng()` path.

### PR-2.2 — Icon resolution LRU  · items: **B16** · effort S
- Module-level LRU in `simple-icons.ts` keyed by slug+color to avoid re-importing
  react-icons and re-running `renderToStaticMarkup` per request. **Verify:** cache
  hit on second identical `?logo=ri:...` request; output byte-identical.
- **Actual outcome:** keyed by slug only, not slug+color — `logoColor` was
  already an unused parameter on `getSimpleIcon` (icon path data doesn't
  depend on color; colors are applied by the caller downstream), confirmed
  by grepping the function body before wiring the cache. Bounded `LRUCache`
  (max 1000) rather than the plan's literal "cache," since an attacker
  enumerating nonsense `?logo=` slugs shouldn't be able to grow an unbounded
  Map — this also meant caching negative "not found" results, which needed
  wrapping (`{ result: ResolvedIcon }`) since `lru-cache`'s value type can't
  be a bare `null`. `badges/simple-icons.test.ts` (6 tests) verifies the win
  directly: spies on `renderToStaticMarkup` and asserts it's called exactly
  once across 3 repeated lookups of the same react-icons slug (proving the
  cache hit, not just that the output matches), plus that different slugs
  don't collide and negative results are cached too.

### PR-2.3 — Token-pool hash lookup  · items: **B17** · effort M
- Add indexed `token_hash` column; invalidate on 401 with one UPDATE instead of
  decrypting every row (`token-pool.ts:215`). Include a migration.
  **Verify:** invalidation test; migration runs idempotently.
- **Actual outcome:** added `token_hash TEXT` (via `ALTER TABLE ... ADD COLUMN
  IF NOT EXISTS`, safe to run against an already-existing deployment's table,
  plus a partial index `WHERE token_hash IS NOT NULL`) to `db.ts`'s schema.
  `addToken()` now populates it — including on the `ON CONFLICT (github_user)
  DO UPDATE` path, which (same bug shape as B6 in memo.ts) previously would
  have left a stale hash after a re-authorization. `invalidateToken()` tries
  one indexed `UPDATE ... WHERE token_hash = $1 ... RETURNING id` first; only
  if that touches zero rows does it fall back to the original decrypt-every-row
  scan, scoped to `WHERE token_hash IS NULL` so it only ever considers rows
  that predate this migration (self-healing: any row it touches gets a hash
  the next time its owner re-authorizes). Verified all of this against the
  same real Postgres instance from PR-1.4/1.6 — `token-pool.test.ts` gained 5
  DB-backed tests (`describe.skipIf(!DATABASE_URL)`) covering hash storage,
  the ON CONFLICT update, the fast path invalidating the right row without
  touching a bystander, the legacy-row fallback (a row inserted directly with
  `token_hash = NULL`, bypassing `addToken()`, to simulate a pre-migration
  row), and the not-found no-op case.

### PR-2.4 — Distributed backoff/budget  · items: **B18** · effort M
- Mirror `recordBackoff`/`isBackedOff` to Redis when the tier is configured
  (`cache.ts:61, 137`); prune the unbounded `staleAlerted` set (`:372`).
  **Verify:** simulated 429 on one "instance" backs off a second; set size bounded.
- **Actual outcome:** `isBackedOff`/`recordBackoff`/`clearBackoff` are now
  async, checking/writing a Redis-mirrored copy (keyed with a TTL matching
  the backoff window, so it self-expires) whenever the local in-memory Map
  doesn't already have fresh state — that only adds a Redis round trip on a
  cache-miss (already about to hit the network) or a fresh instance's first
  failure, never on the warm-cache path. `recordBackoff` also checks the
  remote state before deciding whether it's starting a *new* backoff cycle,
  so instances don't each independently alert on what's really one outage.
  `handleUpstreamStatus` (the fire-and-forget wrapper 3 provider files call)
  stays synchronous — it fires the now-async calls without awaiting, since
  its callers don't need the Redis write to land before continuing, only
  future requests need it to have landed eventually. Updated all 9 direct
  call sites across `route-handler.ts`/`starhistory.ts`/`github.ts` to
  `await`. Deliberately scoped to backoff only, not `consumeBudget`'s smooth
  token-bucket refill — a correct distributed version of that needs an
  atomic Redis Lua script to avoid a check-then-decrement race, which is a
  meaningfully larger undertaking than this item's effort budget; left as a
  future item rather than shipping a half-correct version. `staleAlerted`
  pruning mirrors the existing `token-pool.ts`/`memo.ts` probabilistic-sweep
  pattern (1% of checks).
  Testing this honestly required simulating two separate serverless
  instances, which a single in-process test can't do by construction (the
  whole bug is that they *don't* share memory) — `cache-distributed-backoff.test.ts`
  uses `vi.resetModules()` + a fresh dynamic `import("./cache")` per
  "instance" (each gets its own private module-level Map) against one shared
  mocked Redis backing store. Writing this test surfaced a real gap in the
  first version: an instance that had already hydrated a backoff window from
  a *read* kept trusting that local copy even after another instance
  cleared it in Redis, since `isBackedOff` only re-checks Redis when its own
  local state is absent or expired — not resolvable without either a Redis
  round-trip on every single check (defeating the performance point of
  hydrating at all) or a pub/sub push, so it's now a documented, bounded
  (≤ the backoff window, same 15s–300s range) eventual-consistency tradeoff
  rather than a bug, with a test locking in the exact guarantee: an instance
  that hasn't hydrated a window sees a clear immediately; one that has,
  doesn't, until its local copy naturally expires.

### PR-2.5 — Provider input hygiene  · items: **B19** · effort S
- `encodeURIComponent` for all interpolated path params (starhistory + ~19
  providers); early-return with a "config missing" verdict when `youtube` API key
  is absent. **Verify:** crafted repo segment can't alter upstream path; missing
  key yields a clean badge, not a broken fetch.

**Actual outcome:** Scope was larger than planned — the fix touched ~45
provider files (not ~20), because a full grep sweep after the first pass
turned up interpolation gaps the original audit missed: `nuget.ts`,
`opencollective.ts`, `packagist.ts`, `pypi.ts`, `reddit.ts` (two sites),
`stackexchange.ts` (two sites), `gitlab.ts` (a `state` query param), and
`youtube.ts`'s `link` fields (only the fetch URLs had been encoded, not the
outbound badge links). `youtube.ts`'s existing `if (!API_KEY) return null`
guard in `ytFetch` was already a clean early return, so no behavior change
was needed there beyond the encoding sweep. Added
`src/providers/url-encoding.test.ts` as a regression lock — rather than one
test per file, it spot-checks a representative sample across the fix's
categories (package registries, GitHub's centralized `link()` helper,
community/profile providers, and an instance-hosted provider where only the
path segments — not the caller-supplied hostname — must be encoded) against
a single hostile input containing `/`, `?`, `&`, and `#`. Two lessons from
writing it: (1) providers routed through `safeFetch` (`userControlledHost:
true`, e.g. Weblate) need `node:dns/promises` mocked to a public address in
the test, or the SSRF guard rejects the fake test hostname before the
stubbed `fetch` ever runs; (2) Docker Hub image names legitimately use `/`
as a namespace/repo separator, so a naive "assert the raw slash-containing
input never appears in the URL" test is testing the wrong thing — the
correct assertion is that hostile characters (`?`/`&`/`#`) *within* a single
segment get encoded away while the structural `/` between segments survives.
Verified: full `pnpm test` (247 passed/10 skipped, including the DB-backed
suites against a real local Postgres), `pnpm typecheck` clean across all
packages, and `pnpm --filter @shieldcn/engine build` succeeds.

### PR-2.6 — Renderer clamps + safe casts  · items: **P8 + P7 + P6** · effort M
- Mirror route-level dimension clamps inside `renderBadge`/`renderBadgeGroup`
  (`render.tsx:258`) and wrap `satori()` to degrade to `renderErrorBadge`. Add
  `str()`/`num()` coercion helpers in `provider-fetch.ts` and replace unchecked
  `as` casts (`github.ts:287`, `starhistory.ts:145`, `nuget.ts:42`,
  `mastodon.ts:34`). Extract `createBadgeHandlers({onTrack?})` in core to kill the
  duplicated web/engine route glue (fix engine PUT missing `onError`/`onMetric`).
  **Verify:** `height=1e9` degrades gracefully; schema-shift returns a sensible
  badge not `[object Object]`; both apps build against the shared factory.

**Actual outcome:** All three sub-items landed as planned, plus some
follow-on findings from working the same code paths:
- **P8 (renderer clamps):** Added `BADGE_DIM_BOUNDS`/`clampBadgeDim()` in
  `render.tsx`, exported and reused by `route-handler.ts`'s own `num()`
  parser (single source of truth — the route no longer hand-duplicates the
  bounds table). `resolve()` now clamps `height`/`fontSize`/`padX`/
  `iconSize`/`gap`/`labelGap`/`labelOpacity` unconditionally, so a direct
  `renderBadge()` caller that skips the route layer entirely still can't
  balloon a Satori render. `renderBadge`/`renderBadgeBase` now wrap their
  `satori()` call and degrade to `renderErrorBadge` on failure, guarded by a
  module-private `ERROR_FALLBACK_MARKER` symbol so the fallback call can't
  recurse forever if Satori is broken outright (verified in
  `render-safety.test.ts` by mocking `satori` to fail once — degrades
  cleanly — and to fail always — rethrows after exactly 2 calls instead of
  looping). Found in passing: `BadgeConfig.radius` is parsed and clamped by
  the route but never actually read by `resolve()` for single/group badges
  (`?radius=` is a no-op on the current renderer) — left as-is since fixing
  it is a visual-behavior change outside this item's scope, worth its own
  backlog entry later.
- **P7 (safe casts):** Added `str()`/`num()` to `provider-fetch.ts` and
  applied them at the four call sites named in the plan, plus `discord.ts`'s
  `presence_count`/`instant_invite` casts (found while grepping for the same
  pattern) and `twitch.ts`'s `viewer_count`/`total`/`users[0].id` casts (the
  `id` cast is fed into a follow-up fetch URL — the same risk class as the
  nuget.ts case named in the plan).
- **P6 (shared route glue):** `createBadgeHandlers(options)` in
  `route-handler.ts` unwraps the Next.js `[...slug]` params and wires the
  same `BadgeRequestOptions` to both `GET` and `PUT`; both apps' route files
  now just build their Sentry callbacks and `export const { GET, PUT } =
  createBadgeHandlers({...})`. This also fixes the actual PUT gap: neither
  app's PUT handler passed `onError`/`onMetric` before this change —
  `handleBadgePUT` didn't even accept an options parameter — so memo writes
  had zero error reporting or metrics in both web and engine, not just
  engine as the plan text assumed. `handleBadgePUT` now accepts
  `BadgeRequestOptions`, wraps its body in the same outer try/catch pattern
  as `handleBadgeGET`, and emits a `memo.write` counter tagged by outcome
  (`ok`/`forbidden`/`rate_limited`/`unauthorized`/`bad_request`). core
  deliberately still doesn't import Sentry itself (`onError`/`onMetric`
  stay pass-through) — the "core stays dependency-free" comment on
  `BadgeRequestOptions` predates this PR and nothing here needed to violate it.

Also found and fixed four more B19-class encoding gaps the earlier PR-2.5
sweep missed, surfaced by grepping for the same "unencoded `${var}` in a
fetch/link template literal" pattern while working this PR's adjacent code:
`skills.ts` (owner/repo/skill were unencoded in *both* the fetch URL and the
link — the most severe of the four, since it hits the live API call, not
just an outbound link), `npm.ts` (the `tag` override, reachable via
`/npm/v/{pkg}/{tag}`, was unencoded), and link-only gaps in `crates.ts`,
`chocolatey.ts`, and `twitch.ts`. `docker.ts`'s `getDockerSize` tag param
was also encoded defensively even though it isn't currently reachable with
user input through `route-handler.ts` (always defaults to `"latest"`).

New tests: `render-safety.test.ts` (clamp bounds + Satori-failure fallback,
mocking `satori`'s default export), `provider-fetch.test.ts` (str/num
coercion), `route-glue.test.ts` (createBadgeHandlers params-unwrapping and
option-forwarding, specifically covering the PUT onMetric gap). Verified:
full `pnpm test` (262 passed/10 skipped), `pnpm typecheck` clean, both
`pnpm --filter @shieldcn/engine build` and `pnpm --filter @shieldcn/web
build` succeed, and a live engine server confirms `?height=1e9` still
renders (clamped to 240) and the shared `createBadgeHandlers`-wired PUT
route correctly 401s without a bearer token.

---

## Phase 3 — Frontend accessibility & UX (P1, web)

Runs in parallel with Phase 2. F3/F4/F5 are the concrete PRODUCT.md WCAG
commitments — prioritize them.

### PR-3.1 — Route states  · items: **F2** · effort M
- Add `loading.tsx` skeletons for `/`, `/showcase`, `/gen`, `/token-pool`,
  `/docs`; per-segment `error.tsx`; a branded `not-found.tsx`. **Verify:** throttled
  network shows skeleton not blank; a thrown server page shows the branded error.

**Actual outcome:** Added a shadcn-style `Skeleton` primitive
(`components/ui/skeleton.tsx`) and five `loading.tsx` files. `/`, `/showcase`,
and `/gen` wrap their skeleton in `<SiteShell>` since those pages call
`SiteShell` themselves (no shared layout provides it); `/token-pool` and
`/docs` do the same, though `/docs/loading.tsx` only needs the `<main>`
content since `docs/layout.tsx` already wraps `children` in `SiteShell` +
sidebar. `token-pool/page.tsx` is the one route that's a genuinely async
Server Component (`await getPoolStats()`), so it's the case most likely to
actually hang without a skeleton. Added a single `app/error.tsx` (route
segment error boundary below the root layout, reusing `SiteShell` so
nav/footer survive a crash) and `app/not-found.tsx` — both mirror the
existing `global-error.tsx` pattern but render inside the normal document
tree instead of a bare `<html>`.

**Verification note:** SSR-level rendering was confirmed directly — a
`curl` request to a URL that triggers `notFound()` (an unlisted
`/docs/{slug}`) returns the branded "Page not found" markup verbatim in the
raw HTML response, and the loading skeletons render correctly on
`token-pool`'s genuinely-async route. I could not get a fully conclusive
live-browser confirmation of `error.tsx` specifically: a synthetic page
built to throw unconditionally on every render produced a correct HTTP 500
from curl (server-side dispatch to the error boundary is happening) but a
blank body in headless Chromium after hydration, with no console/page
errors — and the same blank-after-hydration symptom reproduced for the
already-confirmed-working not-found page when reached via Playwright's
`page.goto` instead of `curl`, suggesting a client-navigation/hydration
quirk in this sandbox (possibly interacting with the outbound proxy's
cert-trust gap, which was independently already breaking outbound
`api.github.com` requests in the same test) rather than a defect in either
component — both are structurally correct, type-check against Next's
generated route types, and match the already-shipped `global-error.tsx`
pattern. Flagging this rather than claiming full verification.

Also discovered while building this: a hard-navigation (non-JS/curl/direct
URL) request to `/docs/{unlisted-slug}` returns HTTP 200 instead of 404
despite rendering the correct not-found content — this predates this PR
(reproduces regardless of custom vs. Next's default not-found component)
and looks like a `dynamicParams`/ISR caching interaction on the
`docs/[[...slug]]` catch-all specific to this Next.js/Turbopack version; a
correctness issue worth its own investigation, out of scope here since F2
asked for the branded UI, not response-status semantics.

### PR-3.2 — Reduced motion  · items: **F3** · effort M
- Wire `useReducedMotion` into the 8 remaining motion components
  (`hero-entrance`, `hero-showcase`, `sponsor-button`, `sponsor-entrance`,
  `theme-switcher`, `tour`, `site-announcement`, `animated-header`,
  `fancy/text/underline-to-background`). **Verify:** with OS reduce-motion on, no
  JS spring animation runs.

**Actual outcome:** All 9 named components wired (the plan text says "8
remaining" but lists 9 — did all of them). For each, reduced motion means:
staged entrances skip straight to their final `stage` value instead of
running timers (no staggered reveal), infinite idle-float loops
(`hero-showcase`'s card/badge drift, `site-announcement`'s sheen sweep) stop
entirely rather than continuing at `duration: 0`, and hover/click-triggered
springs (`sponsor-button`'s heart beat, `theme-switcher`'s sun/moon morph,
`tour`'s highlight/cursor/content transitions) resolve instantly instead of
animating.

**Real bug caught in browser verification, fixed before landing:** the
first pass used a shorthand `reduce ? { opacity: 1 } : { opacity, y, filter, ... }`
pattern — the reduced branch only specified `opacity`, dropping `y`/
`filter`/`x`/`scale`/etc. `useReducedMotion()` returns `null` on the very
first render (matching SSR, which has no way to know the client's OS
preference) and only resolves to `true`/`false` after mount. When it
resolved to `true` *after* the component had already started its
non-reduced entrance (e.g. mid-blur, offset from center), Motion's
`animate` target no longer mentioned those properties at all — so they
froze at whatever value they were at instead of resetting, leaving
`/sponsor` permanently blurred under reduced motion (caught via a real
Playwright screenshot with `prefers-reduced-motion` emulated, not just
typecheck/build — this class of bug is invisible to both). Fixed by making
every reduced branch specify the *same* properties as the animated branch,
settled at their final resting value (e.g.
`{ opacity: 1, y: 0, filter: "blur(0px)" }` instead of `{ opacity: 1 }`),
across `hero-entrance`, `hero-showcase`, `sponsor-entrance`, and
`animated-header`. Re-verified with the same screenshot technique — fixed.

**Pre-existing gap found, left unfixed (out of scope):** the same
Playwright verification surfaced a hydration mismatch (React error #418) in
`app/template.tsx` — one of the 3 files *already* using `useReducedMotion()`
before this PR (alongside `sidebar.tsx` and `studio.tsx`, neither of which
this PR touched). Root cause: Motion's `useReducedMotion()` synchronously
reads `matchMedia` on its very first render (confirmed by reading
`framer-motion`'s source), so for a real user who already has OS
reduce-motion enabled *before* the page loads, the client's first render
already knows `reduce: true` — but the server has no way to know that and
always renders the non-reduced baseline. React recovers gracefully (discards
the mismatched SSR subtree, re-renders from the client — confirmed via
screenshot that the final rendered page is correct either way), so this
isn't user-visible breakage, just a wasted extra render pass and a
dev-console warning. Properly fixing it means gating every
`useReducedMotion()` consumer behind a `useHydrated()`-style flag so the
first client render always matches SSR (accepting a one-frame "flash of
un-reduced motion" on load for reduced-motion users) — a real architectural
change touching the 3 pre-existing files too, well beyond "wire the hook
into 8 more components." Logged as new backlog item.

Verified: `pnpm typecheck` clean, `pnpm --filter @shieldcn/web build`
succeeds, and (the meaningful check for this PR) `pnpm test` plus direct
Playwright screenshots of `/` and `/sponsor` with `prefers-reduced-motion:
reduce` emulated via `context.addInitScript` overriding `matchMedia` —
confirmed fully-settled, non-blurred, non-offset content in both states.

### PR-3.3 — Keyboard operability + labels  · items: **F4 + F5** · effort S
- Studio: Alt/Cmd+Arrow block reorder via existing `moveBlock` (`studio.tsx:370`);
  make the resize `role="slider"` (`canvas.tsx:199`) focusable with arrow keys and
  `aria-valuenow/min/max`. Fix builder `<Label htmlFor>` linkage and add
  `aria-label`s to icon-only/variant-preview buttons. **Verify:** full studio flow
  keyboard-only; axe/Lighthouse a11y pass on builder pages.

**Actual outcome:**
- **F4 (Studio keyboard operability):** Added Alt+↑/↓ to `studio.tsx`'s
  existing global keydown handler — reorders the selected block via the
  already-existing `moveBlock()`, skipped while focus is in an editable
  field (same guard the undo/redo shortcut already used). Note: block
  reordering was already keyboard-reachable via the Layers panel's
  move-up/move-down buttons (`studio.tsx:765-766`, already had
  `aria-label`s) — this adds a faster in-place shortcut, not a first path.
  The image-resize handle (`canvas.tsx`) was genuinely keyboard-inaccessible
  (`tabIndex={-1}`, no `aria-valuemin`/`aria-valuemax`, no key handler) —
  fixed with `tabIndex={0}`, both aria-value bounds, and arrow-key resizing
  (Shift for a bigger step), verified live via Playwright: focusing the
  slider and pressing ArrowRight increases `aria-valuenow` with correct
  min-clamping.
- **F5 (label linkage):** Investigated every `<Label>`/`<FieldLabel>` usage
  across the 10 files with unlinked labels (~50 instances) rather than
  applying `htmlFor` blindly. Most were already accessible another way —
  Select/Input/Checkbox controls in `badge-sandbox.tsx`/`chart-sandbox.tsx`
  already carry their own `aria-label`, and toggle-group alignment fields
  already label each button individually — so forcing `htmlFor` there would
  have been redundant, and some wrap multiple children (checkboxes, a
  picker + upload button) where a single `htmlFor` target doesn't apply
  cleanly. Fixed the two real gap classes found: (1) `header-builder.tsx`,
  `sponsors-builder.tsx`, and `contributors-builder.tsx` had ~15
  Input/Select field pairs with genuinely **no** accessible name at all (no
  `aria-label`, no `id`/`htmlFor`, no nesting) — added `id`+`htmlFor` pairs
  for text inputs and `aria-label` for Select triggers across all three
  files, verified live (clicking the "Title" label focuses `#header-title`;
  the "Header size" combobox is now queryable by accessible name). (2) The
  `LogoPicker`/`SearchablePicker` trigger button's only accessible name was
  its *current value* text (e.g. "Auto") with zero context about what it
  picks — added an `ariaLabel` prop threaded through both, set distinctly
  at each of the 4 call sites (e.g. "Badge logo icon", "Chart icon").
  Variant-preview buttons (`badge-builder-core.tsx`) and the "Advanced
  customization" disclosure button were checked and are already correctly
  labeled (image `alt` text and visible button text respectively) — the
  original audit's citation didn't hold up under inspection.

Verified: `pnpm typecheck` clean, `pnpm test` (262/10), `pnpm --filter
@shieldcn/web build` succeeds, and the Studio Alt+↓ reorder was confirmed
live via Playwright (clicking a Layers-panel block then pressing Alt+↓
swaps it with the next block — asserted against the panel's rendered
order, not just that no error was thrown).

### PR-3.4 — Toast + surface failures  · items: **F7** · effort S
- Add a toast primitive (shadcn sonner) to `components/ui/`; replace
  `.catch(() => {})` clipboard swallows and silent `gen-count`/`gen-users` POST
  failures with user feedback. **Verify:** clipboard-denied and network-fail paths
  show a toast.

**Actual outcome:** Added `sonner` as a dependency (wasn't installed —
`pnpm add sonner`), a `components/ui/sonner.tsx` `Toaster` themed via
`next-themes` (standard shadcn registry pattern), mounted once in
`app/layout.tsx`. Then audited every `navigator.clipboard.writeText(...)`
call site (17 files, not just the ones with a literal `.catch(() => {})`) —
most used a fire-and-forget `writeText(x); setCopied(true)` pattern that set
"Copied!" state *unconditionally*, regardless of whether the write actually
succeeded — a worse bug than silence, since it actively lied to the user on
failure. Fixed all of them (8 files) to `.then(onSuccess, onError)` with
`toast.error("Couldn't copy to clipboard")` in the error branch; the 4 files
that already had a `.then(success, error)` pair with inline "Failed" button
state got the toast added alongside their existing handler (both signals
now fire); 2 files awaited the write with no error handling at all
(unhandled promise rejection) — wrapped in try/catch.

**Deliberate deviation from the plan text for `gen-count`/`gen-users`:**
these are background telemetry POSTs that fire *after* the user's badge
generation already succeeded — the generate action itself doesn't depend on
them. A toast here would read as "your request failed" when it didn't,
which is worse UX than the silence it replaces. Reported via
`Sentry.captureException` (tagged `area: "gen-count"`/`"gen-users"`)
instead, so the failure is visible to us without confusing the user who did
nothing wrong. Left the two `.catch(() => {})` swallows in `app/dev/*`
(internal preview tooling, not user-facing) untouched.

Verified: `pnpm typecheck` clean, `pnpm test` (262/10), `pnpm --filter
@shieldcn/web build` succeeds, and — the meaningful check — a live
Playwright run against the production build that overrides
`navigator.clipboard.writeText` to reject and confirms the toast text
renders (screenshot: bottom-right toast "Couldn't copy to clipboard"
alongside the existing inline "Failed" button state).

### PR-3.5 — Builder output extraction + hydration fix  · items: **F8** · effort M
- Extract `lib/builder-output.ts`, a `CopyOutputSection` component, and a
  `useCopyToClipboard` hook shared by all four builders + both badge modals; fold
  the hydration-unsafe baseUrl in `badge-builder.tsx:74` onto the
  `useSyncExternalStore` pattern the others use. **Verify:** all builders produce
  byte-identical output to before; no hydration warning.

**Actual outcome:** All three extractions landed as planned.
`lib/use-copy-to-clipboard.ts` centralizes the copied/copyError timing +
toast-on-failure that PR-3.4 had just added to 8 places — applied to all 6
consumers named in the plan (4 builders + `badge-modal.tsx` +
`badge-group-modal.tsx`). `components/copy-output-section.tsx` extracts the
~30-line format-ToggleGroup + code + copy-button JSX that was
byte-identical across the 4 builders. `lib/builder-output.ts` is narrower
than "one formatter for everything" — badge-builder.tsx's own
`formatOutput` (RST support, routes through `formatBadgeOutput`'s
picture-tag options) and badge-modal.tsx's own (5 formats incl. asciidoc,
different toggle UI) are genuinely different enough from each other and
from the header/sponsors/contributors trio that forcing one shape would
have been the wrong abstraction; the extraction covers exactly the byte-
identical/strict-generalization case that existed (header + sponsors were
character-for-character identical; contributors was the same function with
an added optional link-wrap, which `formatImageOutput`'s optional `link`
param now expresses directly) — `badge-modal.tsx`/`badge-group-modal.tsx`
keep their own distinct UI, just built on the shared hook now.
`badge-builder.tsx`'s `baseUrl` moved from `useState("https://shieldcn.dev")`
+ `useEffect(() => setBaseUrl(window.location.origin), [])` to the same
`useSyncExternalStore` snapshot pattern the other three builders already
used — eliminates the extra post-mount render + brief wrong-origin flash
(e.g. showing `shieldcn.dev` URLs for a beat in local dev before snapping
to `localhost`).

Caught one real bug while extracting `header-builder.tsx`'s JSX into
`CopyOutputSection`: the old JSX had two nested `<div>` wrappers around the
format-switcher block, and my first edit only matched (and replaced) the
inner one, leaving an orphaned closing `</div>` that `tsc` caught
immediately as a parse error — fixed before it ever reached a build.

Verified: `pnpm typecheck` clean, `pnpm --filter @shieldcn/web build`
succeeds, `pnpm test` (262/10), and a live Playwright pass against the
production build confirmed all 4 builders still produce correctly-shaped
output (`badge-builder`'s picture-tag markdown, `header-builder`'s
`![title](url)`, `sponsors-builder`'s same shape, `contributors-builder`'s
link-wrapped markdown) using the real client origin (not the SSR
fallback), plus confirmed the badge modal's copy button still surfaces the
PR-3.4 toast on a simulated clipboard failure.

### PR-3.6 — Motion bundle deferral  · items: **F9** · effort M
- `next/dynamic` (or `LazyMotion`/`m`) for tour + hero choreography; drop eager
  top-level `motion/react` from `sidebar.tsx:6`. **Verify:** shared client bundle
  shrinks (check `next build` output / bundle analyzer); animations still fire.

**Actual outcome:** Both named targets landed; "hero choreography" itself
was left alone (see below).
- **Tour deferral:** extracted the motion-heavy spotlight/cursor/content
  overlay out of `tour.tsx` into a new `tour-overlay.tsx`, loaded via
  `next/dynamic(() => import("@/components/tour-overlay"), { ssr: false })`.
  The naive version of this (render `<TourOverlay>` only while
  `currentStep >= 0`) would have broken the close/exit fade, since
  `AnimatePresence` needs to still be mounted at the moment its child is
  removed to animate the exit — so instead `TourProvider` latches an
  `everStarted` flag true the first time a tour starts and keeps
  `TourOverlay` mounted from then on; `TourOverlay` owns its own
  `AnimatePresence` and decides internally whether to render anything.
  Verified via a live Playwright run against the production build,
  tracking network responses for the overlay's chunk: **not** fetched on
  `/gen`'s initial load, fetched exactly when the user clicks "Show me
  around" (confirmed on both counts), and the overlay itself renders
  correctly (spotlight cutout, pulsing cursor, step counter, screenshotted).
- **Sidebar:** migrated from `motion.div`/`motion.span` (eagerly bundling the
  full animation engine into whatever chunk imports `sidebar.tsx`) to
  `LazyMotion` + `m.div`/`m.span`, with `domMax` (not the smaller
  `domAnimation`) because the active-nav-item indicator uses `layoutId`
  shared-layout animation, which needs the layout-animation feature set.
  This is a code-splitting win (the animation engine becomes a separately
  fetched chunk, not inlined into every file importing `motion/react`)
  rather than a raw-byte reduction, since `domMax` has near-full feature
  parity — `LazyMotion`'s value here is parallel/deferred fetching, not a
  smaller total download. Verified live: docs sidebar renders correctly and
  the "Customization" group's expand/collapse (chevron rotation +
  `layoutId`-driven active-indicator slide) still animates identically
  (before/after screenshots).
- **Hero choreography — deliberately left alone:** `hero-entrance.tsx`,
  `hero-showcase.tsx`, and `animated-header.tsx` all run on first paint of
  the routes that use them (the homepage hero, and `animated-header` via
  `SiteHeader` on literally every page through `SiteShell`) — there's no
  "later" to defer them to; the animation IS the first paint. Deferring
  `AnimatedHeader` in particular would mean the nav bar doesn't render
  until a second async chunk arrives, which is a regression, not an
  optimization. The plan text bundled "tour + hero choreography" together,
  but they aren't the same class of problem — tour is conditional-on-user-
  action (a genuine deferral candidate); the header/hero aren't.

Bundle-size measurement caveat: Turbopack's build output doesn't print a
webpack-style size table, and no bundle analyzer is configured, so this
was verified two ways instead — (1) grepping `.next/static/chunks/*.js`
for the tour overlay's distinguishing string confirmed it landed in its
own ~8KB chunk, separate from `/gen`'s main bundle; (2) the live network-
tracking Playwright run is the actual, direct proof the chunk isn't
fetched until needed, which is the property that matters more than the
byte count.

Verified: `pnpm typecheck` clean, `pnpm --filter @shieldcn/web build`
succeeds, `pnpm test` (262/10), and the two live-browser checks above.

### PR-3.7 — Studio project export/import + safe reset  · items: **F10** · effort M
- "Download/Load project (.json)" beside the Markdown export; confirmed/undo-able
  Reset (`studio.tsx:485`). **Verify:** round-trip export→import restores the doc;
  Reset requires confirmation.

**Actual outcome:** `lib/studio-shared.ts` gained a small `StudioProject`
JSON schema (`{version: 1, blocks, themeAware}`) plus `serializeProject`/
`deserializeProject`. `deserializeProject` validates shape defensively —
JSON parse failure, non-object, wrong `version`, empty/non-array `blocks`,
or any block missing a string `id` / known `type` all return `null` rather
than throwing, so a hand-edited or corrupted file degrades to a toast
error instead of a crash or a half-applied document.

Reset was split into `requestReset` (opens an `AlertDialog`) and
`confirmReset` (does the actual `setBlocks(makeStarterDocument())`). The
deliberate design choice: Reset does **not** get special-cased history
handling — it flows through the same `setBlocks` → history-effect path as
any other edit, so it lands on the undo stack for free and a misclick on
the confirm button is one ⌘Z away, same as any other edit. The
confirmation dialog is the primary safety net; undo is the backstop.

The toolbar's "Import" button became a small dropdown (Import Markdown
.md / Load project .json) to make room for the second import path,
mirroring the existing Export dropdown's shape. Import-project failures
reuse the PR-3.4 toast pattern (`toast.error("Couldn't load that project
file")`) rather than inventing new inline error state, per this session's
established preference for one error-surface convention across the app.

Verified live via Playwright against a production build: (1) clicking
Reset opens the confirmation dialog and Cancel closes it without changing
the doc; (2) confirming Reset closes the dialog and the change is
reachable via ⌘Z; (3) Download project (.json) produces valid
`{version:1, blocks, themeAware}` JSON; (4) round-trip — toggling
"Adaptive light & dark," downloading, then re-importing the same file —
restores the toggled state with no error toast, confirming export→import
fidelity; (5) importing an unrelated/malformed JSON file (`{foo:"bar"}`)
correctly shows the "Couldn't load that project file" toast and leaves
the current document untouched.

Verified: `tsc --noEmit` clean, `pnpm --filter @shieldcn/web build`
succeeds, `pnpm test` (262/10 in `@shieldcn/core`; web/engine/cli have no
test scripts yet — that gap is precisely Phase 4's PR-4.2/PR-4.3), and the
five live-browser checks above. This closes out Phase 3.

---

## Phase 4 — Test coverage

### PR-4.1 — Core risk modules  · items: **B20** · effort L
- Prioritize: `badge.ts` parsing (pure), memo auth flows, `svg-parser` (security),
  and a table-driven provider smoke test off the example paths in `registry.ts`.

**Actual outcome:** `providers/badge.ts` had zero coverage despite being
pure, security-adjacent (fed straight from the URL path) parsing logic —
added `providers/badge.test.ts` (26 tests): every branch of
`parseStaticBadgeContent`'s shields.io-compatible format (1/2/3+ segment
forms, double-dash escaping, single/double-underscore decoding, %-encoding,
short-hex expansion, ambiguous 2-segment color-vs-label detection), the
flag helpers, and `getDynamicJsonBadge` (JSONPath extraction, prefix/suffix,
non-ok status, no-match, and the SSRF-blocked-URL path — mocking the
network boundary the same way `safe-fetch.test.ts` does). Two of the first-
draft assertions were themselves wrong (expected `resolveColor`'s *hex
output* to equal the *input color name*, and expected `getFlagBadge`'s
fallback to split on underscores when it only splits on whitespace) —
caught by actually running the tests against the real implementation
rather than trusting the drafted expectations, then fixed to match verified
behavior.

Memo auth flows and `svg-parser` already had real, dedicated coverage
before this PR (`providers/memo.test.ts` + `badges/memo-route.test.ts`,
19 svg-parser tests) — confirmed by reading both, no gap found, no changes
made.

The "table-driven provider smoke test off the example paths in
`registry.ts`" was attempted and then deliberately dropped. First attempt:
mock DNS + `fetch` to fail deterministically, walk every non-freeform
`REGISTRY` topic's example path through the real `GET` handler, and assert
the response isn't the generic "not found" 404 — the theory being that a
genuinely-dispatched provider degrades a network failure into its own
error/last-known-good badge (still non-404), while an example that's
drifted out of sync with `route-handler.ts`'s hand-written switch/case
falls through to the same generic 404 used for unrouted paths. Running it
surfaced the theory's flaw directly: 147 of 181 cases "failed," and
inspection showed most providers simply `catch { return null }` on any
fetch error — which is the *identical* code path to "undispatched," so
the test couldn't actually distinguish real registry/dispatcher drift from
expected fail-closed behavior. `resolveGitHubBadge`'s more elaborate
stale/last-known-good/`GITHUB_UNAVAILABLE` handling (the case this theory
was built from) turned out to be the exception, not the norm, across ~30
providers. A version with generically-successful mocked responses has the
same problem for the same reason (most providers null-check specific
expected fields and return null on anything else). Doing this properly
needs realistic per-provider response fixtures (~30 providers × shapes),
which is a real, separate, larger effort — logged as a new backlog item
**B23** rather than force-fit into this PR with a test file that would
either be permanently red or hollowed out to the point of asserting
nothing. `registry.test.ts`'s existing "every topic's example resolves
back to that topic" check already covers the routing-table-level half of
this (via `resolveTopic`, independent of `route-handler.ts`'s dispatcher).

Verified: `pnpm --filter @shieldcn/core exec tsc --noEmit` clean,
`pnpm --filter @shieldcn/core test` (288/10, up from 262/10).

### PR-4.2 — CLI + engine  · items: **B22** · effort M
- `migrate.ts` regex conversion, `inject.ts` marker writes, `detect.ts` parsing,
  engine OAuth callback state/scope validation.

**Actual outcome:** Neither `packages/cli` nor `packages/engine` had a
test runner wired up at all — added `vitest` + `vitest.config.ts` + a
`test` script to both (mirroring `@shieldcn/core`'s setup), so `pnpm test`
at the root now covers 3 packages instead of 1.

`migrate.test.ts` (25 tests): every `convertShieldsUrl` branch — static
badge pass-through, npm's `v`/`l` shorthand rewriting, the twitter→x
rewrite, unknown-provider best-effort fallback, every `style=` → `variant=`
mapping, `#`-stripping on color params, and the branded-variant
auto-detection (including its two edge cases: an unrecognized provider
must NOT get auto-branded, and a static `/badge/` only gets branded when
its `logo=` param matches a known brand) — plus `migrateAll`/
`replaceShieldsUrls`.

`inject.test.ts` (12 tests): `injectBadges`'s pure marker logic (insert
after first heading, prepend when no heading, replace between existing
markers, idempotency — running it twice doesn't duplicate the block) plus
`findReadme`/`injectIntoFile` round-tripped through a real scratch temp
directory (`mkdtemp` under the OS tmp dir) rather than mocking `node:fs`,
since the point of testing a destructive read-modify-write is proving it
actually reads, modifies, and writes correctly. One test's expected string
was wrong on the first pass (didn't account for a blank line already
present in the source content before the inserted block) — caught by
running it, fixed to match verified behavior.

`detect.test.ts` (14 tests): `parseGithubUrl` (owner/repo shorthand,
full URL, bare-host form, `.git`/trailing-slash stripping, extra path
segments like `/tree/main`, non-github.com rejection, malformed input) and
`extractShieldsIoUrls`. `inspectLocal`/`inspectRemote` (the fs- and
network-heavy orchestration functions) are left uncovered — logged as a
narrower follow-up rather than expanded into this PR, since properly
testing them needs the same kind of fixture-based network mocking that
PR-4.1's dropped smoke test ran into, applied to GitHub's raw-content API
and the npm registry specifically; a scoped-down version of that is more
tractable than the all-providers sweep and could reuse this PR's
`mkdtemp`-based approach for the local-directory path.

`route.test.ts` for the engine's OAuth callback (14 tests, new
`app/api/auth/github/callback/route.test.ts`): the CSRF state check
(missing state, mismatched state, single-use cookie deletion on every
path including failure), the `not_configured` 503, both upstream fetch
failure paths (token exchange, user lookup), GitHub's own error verdicts,
missing-login rejection, the token-pool write failure path, and —
highest-value assertion in the file — the `scoped_token` rejection: the
pool must only ever hold zero-scope tokens, and since the authorize
redirect URL is user-visible and tamperable, what GitHub actually granted
has to be re-verified here rather than trusted. `next/headers`'s
`cookies()` and `next/navigation`'s `redirect()` are mocked (their real
implementations need an active Next.js request context that doesn't exist
when the route module is imported directly under vitest); `redirect()`'s
mock throws a sentinel error the same way Next's real implementation does,
so the happy-path test asserts on the thrown redirect target rather than
a return value.

Verified: `pnpm typecheck` clean across all 4 packages,
`pnpm test` (288/10 core + 51 cli + 14 engine = 353 passed, 10 skipped).

### PR-4.3 — Web  · items: **F6** · effort L
- `lib/studio-shared.ts` (export fidelity — the core product promise),
  `lib/studio-import.ts`, builder output formatting, `lib/gen/detect.ts`.

**Actual outcome:** `packages/web` had no test runner either — added
`vitest` + `jsdom` (needed because `studio-import.ts`'s HTML-chunk parser
uses the browser's real `DOMParser`, which only exists under a DOM test
environment, not plain Node) + `vitest.config.ts` with an `@/*` alias
matching the app's own tsconfig path.

`studio-shared.test.ts` (35 tests) covers `documentToMarkdown`/
`blockToMarkdown` — the actual "what you see in the editor is what ends up
in your README" promise — across every block type's plain vs. aligned-
wrapper vs. theme-aware `<picture>` shape, `tableToGfm`'s cell escaping
(pipes/backslashes/newlines, short-row padding), `buildGroupUrl`/
`buildChartUrl`'s empty-input null-returns, and the `serializeProject`/
`deserializeProject` round-trip added in PR-3.7 (this PR is the first time
that JSON schema got direct unit coverage rather than only the live-browser
check from PR-3.7).

`studio-import.test.ts` (13 tests) covers the inverse direction —
`markdownToDocument` — including reversing shieldcn image URLs back into
typed Badge/Header/Group blocks, GFM table parsing, and (since this file
runs under jsdom) the `<p align>`/`<picture>` HTML-chunk path that a
Node-only test environment can't reach at all. One test's own markdown
fixture was wrong on the first pass — a bare `<picture>` tag with no
block-level wrapper isn't a CommonMark HTML block (`picture` isn't in the
spec's type-6 tag list), so it never reached the code path under test;
fixed by wrapping it in `<p align>`, matching what `blockToMarkdown`
actually emits in practice. Also added two round-trip tests (export the
starter document, re-import it, assert block shape and specific field
values survive).

`builder-output.test.ts` (5 tests): full coverage of `formatImageOutput`'s
three formats × linked/unlinked, the whole file (35 lines).

`gen/detect.test.ts` (6 tests): `parseGithubUrl` only — this file's
`inspect()` is the network-heavy orchestration function (probes ~50 files,
fetches package.json/README from raw.githubusercontent.com, hits the npm
registry), the same class of thing PR-4.2 already declined to cover for
the CLI's `inspectLocal`/`inspectRemote` for the same reason: a pass/fail
network mock can't tell "wired correctly" from "degrades to fewer badges,"
and doing it properly needs realistic fixtures, not a table-driven sweep.

Verified: `tsc --noEmit -p .` clean, `pnpm test` (288/10 core + 51 cli +
14 engine + 59 web = 412 passed, 10 skipped). This closes out Phase 4.

---

## Phase 5 — Hygiene & polish (P2)

Batch freely; each is independent. P5/P8 already folded into PR-2.6.

**Pre-Phase-5 bookkeeping fix:** P11 and P13 were completed back in Phase 0
(PR-0.2, PR-0.3) but their `IMPROVEMENTS.md` checkboxes were never ticked —
corrected now, verified against the actual files (`commit-check.toml`
already matches `.husky`'s type/branch lists; `.github/dependabot.yml`
exists and covers npm/github-actions/docker). P15 was intentionally left
partial by PR-1.2 (only the crypto/TLS-related env docs were in scope
there); finished the rest here — `NEXT_PUBLIC_SENTRY_DSN` added to the env
table, `/api/gen-count` and the two OAuth token-pool endpoints documented,
and a "change this" warning added next to the quick-start's placeholder
Postgres credentials.

- **PR-5.1** ✅ SEO/PWA: sitemap gaps + manifest + theme-color · **P2** · S — `app/sitemap.ts` gained `/contributors`, `/sponsors`, `/privacy` (matched to their nearest sibling's priority/frequency — `/gallery` deliberately excluded, it's a bare redirect to `/showcase` with no content of its own, and a sitemap entry for a redirect is sitemap spam, not a real gap); new `app/manifest.ts` (Next's file-convention → auto-linked `<link rel="manifest">`, verified live); `layout.tsx` gained a `viewport` export with light/dark `themeColor` (Next 14+ moved `themeColor` out of `metadata` into its own export — putting it in `metadata` would silently no-op). Verified live via curl: `/manifest.webmanifest` serves valid JSON, `/sitemap.xml` contains all three new routes, and both `<meta name="theme-color">` tags render with the correct `media` queries.
- **PR-5.2** ✅ Guard/noindex `/dev/*`; drop `html-to-image` from prod bundle · **P1** · S — all 7 pages under `app/dev/` now call `notFound()` outside development. The two client-component pages (`preview`, `social` — the ones that import `html-to-image`) were restructured: their component bodies moved to `preview-client.tsx`/`social-client.tsx` (still `"use client"`), and `page.tsx` became a plain server component doing the guard + rendering the client component — so in production the guard runs *before* any client JS ships, not after. The other 5 pages (already server components) got the guard inline. Verified live: all 7 routes render "Page not found" content in production (grepped the served HTML for the not-found page's text, absent any dev-page-specific markup), and `/dev/preview`/`/dev/social`'s served HTML contains no reference to `html-to-image`/`toPng` — confirming that bundle never reaches a production client. **Found but out of scope:** the HTTP status served for these (and, it turns out, for *any* unmatched route site-wide, e.g. `/this-does-not-exist-xyz`) is `200`, not `404` — the rendered content is correct but the status code isn't. This reproduces without any of this PR's changes and is broader than the single `/docs/{slug}` case flagged in PR-3.1's notes; likely an interaction between `middleware.ts`'s `NextResponse.next()` passthrough and Turbopack's static-notFound handling under `next start`. Logged as new backlog item **P18** rather than debugged here — `robots.txt` already disallows `/dev/`, so crawl exposure isn't blocked on this, but a wrong status code is worth its own investigation.
- **PR-5.3** ✅ Dead-code removal (`route-handler.ts:514`, `cocoapods` platform,
  legacy `github.ts`, unused `KNOWN_PARAMS`) · **P3** · S — removed the unused
  `pkg` computation in `route-handler.ts`'s npm case (its ternary's both branches
  evaluated to the same value — a no-op slice whose result was never read anyway);
  deleted `getCocoaPodsPlatform` entirely (confirmed zero call sites — it wasn't
  even wired into `route-handler.ts`'s dispatch, and returned a hardcoded
  `"ios | macos"` for every pod regardless of what it actually supports, so
  keeping it as dead code was strictly worse than deleting it); removed
  `formatCount`'s duplicate definition + the dead `formatStarCount` alias + the
  unused `fetchShieldcnRepoCount` from core's legacy `src/github.ts` (kept
  `fetchGitHubRepo`/`GitHubRepo`, still used by `github-stars-button.tsx`) —
  `github-stars-button.tsx` now imports `formatCount` from `@shieldcn/core/format`
  (the canonical, still-used copy) instead of the deleted duplicate; removed the
  never-referenced `KNOWN_PARAMS` set from `normalize-params.ts` and corrected
  its docblock, which claimed unknown params get stripped when the code never
  did that (only default-valued params are stripped — provider-specific params
  like chart's `values`/`days`/`icon` always pass through, and there's no single
  allowlist that covers every provider, so this doc fix describes reality rather
  than adding new filtering behavior that could silently break working badge
  URLs). Verified: `tsc --noEmit` clean across all 4 packages, `pnpm test`
  (288/10 core unaffected by these deletions — nothing tested the removed dead
  code), and a full `next build` + live screenshot of the header confirming
  `github-stars-button.tsx` still renders correctly with the swapped import.
- **PR-5.4** ✅ Resolve Twitch (re-enable end-to-end or delete both sides) · **P4** · S
  — chose re-enable over delete: `providers/twitch.ts` was fully written and
  gracefully returns `null` when `TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET`
  aren't set (identical fail-open pattern to YouTube's `YOUTUBE_API_KEY`),
  so there was working code behind the flag, not a stub. Uncommented the
  import and the `route-handler.ts` case — and fixed a real bug in the
  disabled draft while re-enabling it: the original commented code guarded
  with `if (rest.length < 2) return null`, which would have permanently
  blocked the bare-login form (`/twitch/{login}` with no topic segment,
  `rest.length === 1`) even after uncommenting; rewrote it to match the
  topic-or-bare-identifier pattern every other provider in this switch uses
  (`amo`, `chrome`, `flathub`, …): `rest.length === 0` guard, dispatch by
  topic when `rest[0]` is a known topic AND `rest[1]` exists, else treat
  `rest[0]` itself as the login defaulting to `status`. Added a `twitch`
  entry to `badges/registry.ts` (it had none — every other routed provider
  does), uncommented + added a `followers` companion to the web badge
  builder's Twitch preset, and documented `TWITCH_CLIENT_ID`/
  `TWITCH_CLIENT_SECRET` in the engine's README env table, `.env.example`,
  and `docker-compose.yml`.
  **Found and fixed along the way:** while running the full test suite to
  verify this, `memo-route.test.ts`'s rate-limit test started failing —
  confirmed via `git stash` that this is 100% pre-existing and unrelated
  (reproduces on the commit before this PR too). Root cause: with no
  `DATABASE_URL` in this environment, each of the 20 under-the-limit
  requests reaches `upsertMemoBadge`, which retries once after a 250ms
  pause on a connection error (`db.ts`'s `query()` — a deliberate
  serverless-Postgres-wake-up retry, correct production behavior, not a
  bug). 20 × ~250ms lands right at vitest's 5000ms default timeout, an
  inherently fragile margin. Bumped just that test's timeout to 15s rather
  than touching the retry logic or mocking the DB layer (which the test
  file's own docstring deliberately avoids for its other 6 assertions).
  Verified: `pnpm typecheck` clean across all 4 packages, `pnpm test`
  (288/10 core, previously-flaky memo-route test now reliably green,
  51 cli + 14 engine + 59 web unaffected), and live: `/twitch/status/
  {login}.svg`, `.json`, and the bare-login form all dispatch correctly
  and degrade to a graceful "not found" (not a crash) without Twitch
  credentials configured — the same fail-open behavior every other
  optional-credential provider already has.
- **PR-5.5** ✅ Dedup render helpers (`luminance`/`rgba`/`esc`/`clamp`/`findFontsDir`/
  `formatCount` ×2) · **P5** · M — consolidated five clusters of copy-pasted
  helpers into shared modules, grouped by their genuine consumer rather than
  forced into one grab-bag:
  - **`badges/satori-fonts.ts`** (new) — the `findFontsDir()` + 7 `readFileSync`
    calls + `FONT_CONFIG` + `getFonts()` block was byte-identical in `render.tsx`
    and `render-group.tsx` (both render shadcn Buttons via Satori). `BadgeFont` is
    re-exported from `render.tsx` so its public type surface is unchanged.
    Deliberately kept separate from the existing `fonts.ts`, which loads the same
    TTFs but shapes them as a flat `Uint8Array[]` for **resvg**'s PNG API — a
    different consumer with a different shape, not a merge candidate.
  - **`render.tsx` now exports `luminance`/`rgba`** — `render-group.tsx` imported
    them instead of redefining (its own copies were verbatim).
  - **`badges/svg-text-utils.ts`** (new) — `esc`/`r2`/`clamp` were triplicated
    across the three hand-built-SVG renderers (chart/header/sponsors); chart had
    no `clamp`, the other two did — the shared module exports all three.
  - **`provider-fetch.ts` now exports `isRateLimitResponse`** — was identical in
    `providers/github.ts` and `providers/starhistory.ts` (both hit the GitHub API
    directly and need the same 403-with-exhausted-quota detection).
  - **`providers/coverage-color.ts`** (new) — `providers/codecov.ts` and
    `providers/coveralls.ts` had the same `pct >= 90 ? green : …` threshold ladder;
    `coveragePctAndColor()` gives them one source of truth so the two coverage
    providers can't drift on what counts as "good."
  Note: `render-chart.ts` keeps its own `rgba` — it takes a *spaced* `rgba(r, g,
  b, a)` string for inline SVG, distinct from `render.tsx`'s compact
  `rgba(r,g,b,a)` for Satori; merging them would change one renderer's output
  bytes, so they're intentionally left separate. Verified: `tsc --noEmit` clean,
  full `pnpm test` (288/10 core, all packages green), full `next build`, and a
  live Playwright screenshot pass — badge/group/chart/header all render
  byte-identically to before (group's outline ButtonGroup + separator, header's
  gradient/title/subtitle, chart's axes/gridlines, single badge's branded fill).
- **PR-5.6** ✅ Version single-sourcing (engine health, CLI) · **P9** · S — both
  the CLI (`bin.ts`, was a hardcoded `const version = "1.0.0"`) and the engine
  health route (was `version: "0.0.1"` string literal) now
  `import pkg from "…/package.json" with { type: "json" }` and read `pkg.version`.
  esbuild inlines the JSON into the CLI's `dist/bin.js` at build (verified:
  `shieldcn --version` → `1.0.0`); Next bundles it into the engine route
  (verified live: `GET /api/health` → `"version":"0.0.1"`). Both are now
  physically incapable of drifting from their package.json. Verified: `tsc`
  clean for both packages, CLI built + `--version` checked, engine `next build`
  + live `/api/health` hit.
- **PR-5.7** ✅ CLI npm release workflow + gitignore `dist/` · **P10** · M —
  `packages/cli/dist/bin.js` was tracked in git (guaranteed to drift from
  `src/`): `git rm --cached`'d it and added `packages/cli/.gitignore` (`dist/`).
  Added a `prepublishOnly: pnpm build` hook so any publish path (CI or manual)
  ships a fresh bundle. New `.github/workflows/cli-publish.yml`: triggers on
  `cli@*` tag push (mirroring `docker-publish.yml`'s `engine@*` convention) or
  manual dispatch (defaulting to a `--dry-run`); runs typecheck + test + build
  as a release gate, verifies the tag version matches package.json on tag pushes
  (fails loudly on a mistag), and `pnpm publish --access public --provenance`
  with `id-token: write` for npm provenance attestation. Requires an `NPM_TOKEN`
  repo secret (documented in the workflow). Verified: workflow is valid YAML,
  `npm pack --dry-run` ships exactly `dist/bin.js` + `package.json` + README +
  LICENSE, a clean rebuild regenerates `dist/` (now correctly gitignored, not
  re-added to git), and full `pnpm typecheck`/`pnpm test` stay green.
- **PR-5.8** ✅ Docker/supply-chain hardening (digest pin, HEALTHCHECK, arm64, SHA-pin
  actions, SBOM) + build-on-PR (**B13**) · **P12** · M —
  **Dockerfile:** both `FROM node:22-alpine` lines now pin the base by digest
  (`sha256:16e22a55…`, resolved live from Docker Hub's registry API and confirmed
  to be a multi-arch index covering linux/amd64 + linux/arm64), so a rebuild can't
  silently pull a different base. Added a baked-in `HEALTHCHECK` using node's
  global `fetch` against `/api/health` — no curl/wget dependency in the runtime
  image, and unlike the compose-only healthcheck it applies to a bare
  `docker run` too.
  **Workflow (`docker-publish.yml`):** builds `linux/amd64,linux/arm64` via
  `setup-qemu-action` (ARM self-hosters previously had no runnable image);
  emits SBOM + `mode=max` SLSA provenance attestations on pushed images (added
  `id-token: write` + `attestations: write`); and **B13** — added a
  `pull_request` trigger (paths-filtered to engine/core/lockfile/Dockerfile) that
  builds the image without pushing, so a broken Dockerfile is caught in review
  instead of at release. Only tag/dispatch runs log in to GHCR and push.
  **Action SHA-pinning — deliberately deferred, not skipped:** actions are kept
  on major-version tags managed by the existing Dependabot `github-actions`
  ecosystem (P13). Converting to verified commit-SHA pins requires a resolver
  that checks each SHA against upstream (e.g. `pinact`), which needs GitHub API
  access this build environment's proxy blocks — hand-typing unverifiable SHAs is
  a worse footgun than a Dependabot-watched tag. Documented inline at the top of
  the workflow.
  **Verification limits:** no Docker daemon in this environment (CLI present,
  socket absent), so a real `docker build` couldn't run. Verified instead: both
  workflow files are valid YAML, the base digest resolves + is genuinely
  multi-arch, and the HEALTHCHECK node one-liner passes `node --check` with
  `fetch` confirmed global in node 22. The Dockerfile changes are mechanical
  (digest-format pin + one HEALTHCHECK line); the actual multi-arch build /
  attestation runs will first exercise on the next PR via the new build-on-PR
  trigger.
- **PR-5.9** ✅ Configurable Sentry sample rates · **P14** · S — both
  `sentry.server.config.ts` (traces + profiles) and `sentry.edge.config.ts`
  (traces) hardcoded `tracesSampleRate: 1`/`profilesSampleRate: 1` — sampling
  every request, expensive at badge-service volumes. Now read from
  `SENTRY_TRACES_SAMPLE_RATE` / `SENTRY_PROFILES_SAMPLE_RATE` via a small
  clamped parser (default `0.1`, ignores out-of-range/non-numeric input and
  falls back). Documented both in the README env table and `.env.example`.
  Verified: engine typechecks + builds, and the parser's fallback/clamp logic
  passes a unit check (undefined/empty/valid/0/1/out-of-range/non-numeric all
  resolve as intended). Sentry stays fully inert without a DSN, unchanged.
- **PR-5.10** ◑ Split monolith client files (`inspectors.tsx`, `generator-client.tsx`)
  · **P16** · M — **partially done, with a deliberate re-scope.** While surveying
  `inspectors.tsx` (1387 lines) for a per-block-type split, I found the more
  meaningful problem: its badge-preset grouping/search/reverse-match helpers
  (`PRESET_GROUPS`, `PRESET_GROUP_NAMES`, `PRESET_FILTERS`, `getPresetService`,
  the display-label fn, `presetMatchesSearch`, and the path→preset matcher) were
  **duplicated** in `badge-builder-core.tsx` — and the two `findMatchingPreset`
  copies had diverged: the builder's escaped only `.` in templates, so a Group
  preset's literal `+` acted as a regex quantifier and corrupted param
  extraction (the exact bug the Studio's copy documented having fixed). Extracted
  the unified, correct logic to a new pure module `lib/badge-preset-match.ts`,
  wired both consumers to it (preserving each call site's exact semantics via a
  `skipStatic` option — the builder must still reverse-match the static Custom
  preset, the Studio must not), and added `lib/badge-preset-match.test.ts`
  (14 tests, incl. a regression lock on the `+`-template case and a round-trip
  over every non-static preset). This removes ~90 lines from `inspectors.tsx` and
  ~115 from `badge-builder-core.tsx`, fixes a real latent bug in the builder, and
  makes the trickiest logic unit-testable — the substantive maintainability win.
  **Deferred (documented, not silently skipped):** the raw per-block-type JSX
  file explosion of both monoliths. Rationale: (1) these inspectors are all
  statically imported and conditionally rendered by `studio.tsx`, so
  file-splitting yields **zero bundle savings** — the plan's cited "per-inspector
  code-splitting" benefit only materializes with a separate `next/dynamic`
  conversion, which is a behavior change (loading states) beyond this item's
  scope; (2) the files have no test coverage, making large mechanical JSX churn
  disproportionately risky for a purely-cosmetic editor-readability gain; (3) the
  genuine coupling debt (the duplicated logic) is now resolved. Logged the
  remaining editor-readability split as **P19**. Verified: `tsc` clean, `pnpm
  test` (web 73, +14), full `next build`, and a live Playwright pass — the
  homepage badge builder's preset picker (grouping, "stars" search →
  GitHub-stars + both `+`-template Group presets, display labels) and the Studio
  badge inspector both work correctly against the shared module.
- **PR-5.11** ✅ Pay down pre-existing web lint debt (17 errors, mostly
  React-Compiler setState-in-effect timing issues); flip `ci.yml`'s Lint step
  from `continue-on-error: true` to a hard gate · **P17** · M — cleared all
  errors + warnings (`pnpm lint` exit 0) and flipped the CI gate to hard.
  Breakdown of the ~21 problems, fixed by root cause rather than suppression
  (the audit's explicit requirement):
  - **Hydration-gate class (5 files):** `badge-card`, `group-showcase`,
    `hero-icon-cloud`, `animated-showcase`, `badge-marquee` each did the
    `useState(false)` + `useEffect(() => setMounted(true))` dance. Replaced with
    a new `lib/use-hydrated.ts` (`useSyncExternalStore`, false on server/first
    paint → true after hydration) — behavior-identical, no cascading render.
    (This hook is also the building block **F11** proposed; F11's own fix —
    wrapping the 12 `useReducedMotion` consumers — is separate and still open.)
  - **localStorage-read-into-state (2 files):** `analytics`, `github-star-cta`
    read persisted opt-out/dismissal via `useSyncExternalStore` now, keeping only
    the genuine *write* side effects (consent write, visit-count, open/close
    timers) in effects. `analytics` also loses its flash-of-analytics-before-
    opt-out.
  - **Reset-on-change:** `mobile-nav`'s `setOpen(false)` on route change →
    React's render-phase "adjust state when a value changes" (prev-pathname
    key), not an effect.
  - **Latch:** `tour`'s `everStarted` set during render instead of an effect.
  - **Real ordering bug:** `tour`'s `setIsTourCompleted` was used by `nextStep`
    before its declaration (react-hooks/immutability) — hoisted it above.
  - **Refs-during-render (3, `canvas.tsx`):** the image-resize handle read
    `imgRef.current?.offsetWidth` during render for `aria-valuenow`. Now captures
    the natural width via the img's `onLoad` (an event handler) into state.
  - **Create-component-during-render (`underline-to-background`):** used
    `motion.create(as)` in render; no caller ever overrode the `span` default, so
    switched to the static `motion.span` and dropped the unused `as` prop.
  - **Trivial:** `<a>`→`<Link>` for an internal docs link; a justified
    `no-html-link-for-pages` disable for the token-pool `<a>` that points at an
    OAuth *API* route (not a page); justified `no-img-element` disables for the
    two dynamic-badge/satori `<img>`s; removed 3 unused vars + 2 stale
    eslint-disable directives; `&&`-expression-as-statement → `if`.
  - **Two justified suppressions (not silenced bugs):** `tour`'s post-render DOM
    layout measurement and `migrate-client`'s on-mount install-redirect resume
    are legitimate effect-setState (measure-and-store / initialize-from-URL), not
    the cascading-render pattern the rule targets — scoped `eslint-disable` with
    a comment explaining each, per the audit's "several are false positives" note.
  Verified: `pnpm lint` exit 0, `pnpm typecheck` clean, `pnpm test` (all
  packages green), full `next build`, and a live Playwright pass across home
  (icon cloud / marquee / underline / star-CTA / analytics), showcase
  (badge-card / group-showcase / animated-showcase, 278 badges), studio
  (canvas), and docs at mobile width (MobileNav open/close) — zero page errors
  beyond the pre-existing site-wide "not" SyntaxError (logged as **P20**). CI
  `Lint` step flipped to a hard gate. **This closes out Phase 5 and the entire
  execution plan.**

---

## Milestone summary

| Milestone | PRs | Items | Exit criteria |
|---|---|---|---|
| M0 Foundation | 0.1–0.3 | B12, P11, P13 | Build/test/typecheck green on every PR; deps automated; lint runs but is non-blocking pending PR-5.11 |
| M1 Security | 1.1–1.6 | B1–B11, F1, P15 | No known SSRF / weak-crypto / unbounded-write paths |
| M2 Reliability | 2.1–2.6 | B15–B19, P6–P8 | Hot paths cached; renderer can't be crashed by input |
| M3 Frontend a11y | 3.1–3.7 | F2–F10 | WCAG 2.1 AA commitments met; keyboard-complete studio |
| M4 Tests | 4.1–4.3 | B20, B22, F6 | Coverage on parsing/auth/security + export fidelity |
| M5 Hygiene | 5.1–5.10 | P1–P5, P9, P10, P12, P14, P16, B13 | Dead code gone; releases automated; bundle trimmed |

**Recommended order:** M0 → (M1 backend ∥ M3 frontend) → M2 → M4 → M5.
Coordinate PR-1.3 across both tracks; everything else in M1/M3 is independent.

## Definition of done (every PR)
- `pnpm turbo build lint` and `vitest run` pass in CI.
- New behavior has a test (P0/P1) or a documented manual verification (UI polish).
- Item checkbox ticked in `IMPROVEMENTS.md`; PR description links the item ID.
- No unrelated file churn; one concern per PR.
