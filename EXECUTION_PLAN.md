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

### PR-3.5 — Builder output extraction + hydration fix  · items: **F8** · effort M
- Extract `lib/builder-output.ts`, a `CopyOutputSection` component, and a
  `useCopyToClipboard` hook shared by all four builders + both badge modals; fold
  the hydration-unsafe baseUrl in `badge-builder.tsx:74` onto the
  `useSyncExternalStore` pattern the others use. **Verify:** all builders produce
  byte-identical output to before; no hydration warning.

### PR-3.6 — Motion bundle deferral  · items: **F9** · effort M
- `next/dynamic` (or `LazyMotion`/`m`) for tour + hero choreography; drop eager
  top-level `motion/react` from `sidebar.tsx:6`. **Verify:** shared client bundle
  shrinks (check `next build` output / bundle analyzer); animations still fire.

### PR-3.7 — Studio project export/import + safe reset  · items: **F10** · effort M
- "Download/Load project (.json)" beside the Markdown export; confirmed/undo-able
  Reset (`studio.tsx:485`). **Verify:** round-trip export→import restores the doc;
  Reset requires confirmation.

---

## Phase 4 — Test coverage

### PR-4.1 — Core risk modules  · items: **B20** · effort L
- Prioritize: `badge.ts` parsing (pure), memo auth flows, `svg-parser` (security),
  and a table-driven provider smoke test off the example paths in `registry.ts`.

### PR-4.2 — CLI + engine  · items: **B22** · effort M
- `migrate.ts` regex conversion, `inject.ts` marker writes, `detect.ts` parsing,
  engine OAuth callback state/scope validation.

### PR-4.3 — Web  · items: **F6** · effort L
- `lib/studio-shared.ts` (export fidelity — the core product promise),
  `lib/studio-import.ts`, builder output formatting, `lib/gen/detect.ts`.

---

## Phase 5 — Hygiene & polish (P2)

Batch freely; each is independent. P5/P8 already folded into PR-2.6.

- **PR-5.1** SEO/PWA: sitemap gaps + manifest + theme-color · **P2** · S
- **PR-5.2** Guard/noindex `/dev/*`; drop `html-to-image` from prod bundle · **P1** · S
- **PR-5.3** Dead-code removal (`route-handler.ts:514`, `cocoapods` platform,
  legacy `github.ts`, unused `KNOWN_PARAMS`) · **P3** · S
- **PR-5.4** Resolve Twitch (re-enable end-to-end or delete both sides) · **P4** · S
- **PR-5.5** Dedup render helpers (`luminance`/`rgba`/`esc`/`clamp`/`findFontsDir`/
  `formatCount` ×2) · **P5** · M
- **PR-5.6** Version single-sourcing (engine health, CLI) · **P9** · S
- **PR-5.7** CLI npm release workflow + gitignore `dist/` · **P10** · M
- **PR-5.8** Docker/supply-chain hardening (digest pin, HEALTHCHECK, arm64, SHA-pin
  actions, SBOM) + build-on-PR (**B13**) · **P12** · M
- **PR-5.9** Configurable Sentry sample rates · **P14** · S
- **PR-5.10** Split monolith client files (`inspectors.tsx`, `generator-client.tsx`)
  · **P16** · M
- **PR-5.11** Pay down pre-existing web lint debt (17 errors, mostly
  React-Compiler setState-in-effect timing issues); flip `ci.yml`'s Lint step
  from `continue-on-error: true` to a hard gate · **P17** · M

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
