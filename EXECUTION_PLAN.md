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

### PR-2.3 — Token-pool hash lookup  · items: **B17** · effort M
- Add indexed `token_hash` column; invalidate on 401 with one UPDATE instead of
  decrypting every row (`token-pool.ts:215`). Include a migration.
  **Verify:** invalidation test; migration runs idempotently.

### PR-2.4 — Distributed backoff/budget  · items: **B18** · effort M
- Mirror `recordBackoff`/`isBackedOff` to Redis when the tier is configured
  (`cache.ts:61, 137`); prune the unbounded `staleAlerted` set (`:372`).
  **Verify:** simulated 429 on one "instance" backs off a second; set size bounded.

### PR-2.5 — Provider input hygiene  · items: **B19** · effort S
- `encodeURIComponent` for all interpolated path params (starhistory + ~19
  providers); early-return with a "config missing" verdict when `youtube` API key
  is absent. **Verify:** crafted repo segment can't alter upstream path; missing
  key yields a clean badge, not a broken fetch.

### PR-2.6 — Renderer clamps + safe casts  · items: **P8 + P7 + P6** · effort M
- Mirror route-level dimension clamps inside `renderBadge`/`renderBadgeGroup`
  (`render.tsx:258`) and wrap `satori()` to degrade to `renderErrorBadge`. Add
  `str()`/`num()` coercion helpers in `provider-fetch.ts` and replace unchecked
  `as` casts (`github.ts:287`, `starhistory.ts:145`, `nuget.ts:42`,
  `mastodon.ts:34`). Extract `createBadgeHandlers({onTrack?})` in core to kill the
  duplicated web/engine route glue (fix engine PUT missing `onError`/`onMetric`).
  **Verify:** `height=1e9` degrades gracefully; schema-shift returns a sensible
  badge not `[object Object]`; both apps build against the shared factory.

---

## Phase 3 — Frontend accessibility & UX (P1, web)

Runs in parallel with Phase 2. F3/F4/F5 are the concrete PRODUCT.md WCAG
commitments — prioritize them.

### PR-3.1 — Route states  · items: **F2** · effort M
- Add `loading.tsx` skeletons for `/`, `/showcase`, `/gen`, `/token-pool`,
  `/docs`; per-segment `error.tsx`; a branded `not-found.tsx`. **Verify:** throttled
  network shows skeleton not blank; a thrown server page shows the branded error.

### PR-3.2 — Reduced motion  · items: **F3** · effort M
- Wire `useReducedMotion` into the 8 remaining motion components
  (`hero-entrance`, `hero-showcase`, `sponsor-button`, `sponsor-entrance`,
  `theme-switcher`, `tour`, `site-announcement`, `animated-header`,
  `fancy/text/underline-to-background`). **Verify:** with OS reduce-motion on, no
  JS spring animation runs.

### PR-3.3 — Keyboard operability + labels  · items: **F4 + F5** · effort S
- Studio: Alt/Cmd+Arrow block reorder via existing `moveBlock` (`studio.tsx:370`);
  make the resize `role="slider"` (`canvas.tsx:199`) focusable with arrow keys and
  `aria-valuenow/min/max`. Fix builder `<Label htmlFor>` linkage and add
  `aria-label`s to icon-only/variant-preview buttons. **Verify:** full studio flow
  keyboard-only; axe/Lighthouse a11y pass on builder pages.

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
