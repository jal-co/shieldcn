# shieldcn — Feature Audit & Improvement Backlog

> Full-repo audit (2026-07). Each item is scoped for an agent to execute independently:
> title, rationale with file references, and effort (S/M/L). Items are grouped by
> priority tier, then by area. File:line references were verified at audit time and
> may drift — re-verify before editing.

---

## 1. Feature inventory

### `packages/core` — shared badge engine

- **Route layer** — `src/route-handler.ts` (~3,800 lines): shared GET/PUT handler for web + engine. Output formats: `.svg`, `.png` (resvg-wasm), `.gif` (animated), `.json`, `shields.json` (shields.io compat). Endpoint families: single badges, `/group/{a+b+c}`, `/chart/...` (GitHub stars/issues/commits, npm download series, inline/remote JSON), `/header/{preset}`, `/sponsors/{login}`, `/contributors/{owner}/{repo}`, `/https/{host}/...` proxy, PUT `/memo/...` (bearer-token badge upsert). `src/normalize-params.ts` canonicalizes query params for CDN cache hits.
- **Rendering** — `src/badges/render.tsx` (Satori main renderer), `render-group.tsx`, `render-chart.ts`, `render-header.ts`, `render-sponsors.ts` (also used by contributors); `gif.ts` + `animate.ts` (keyframe animations, GIF baking); icon stack: `simple-icons.ts` (SimpleIcons + `ri:` React Icons + `lu:` Lucide), `custom-icons.ts`, `twemoji.ts`, `svg-parser.ts` (user data-URI SVGs), `brand-colors.ts`, `flags.json`; design tokens: `button-tokens.ts`, `themes.ts`, `measure.ts`, `fonts.ts` (7 bundled TTFs); `registry.ts` + `validate.ts` (provider/variant registry).
- **Providers** (~55 modules in `src/providers/`) — registries (npm, pypi, crates, rubygems, packagist, nuget, pub, maven, cocoapods, conda, homebrew, chocolatey, jsr, bundlephobia, jsdelivr), git hosting (github, gitlab, star/commit history), app stores (vscode, openvsx, chrome, amo, flathub, snapcraft, fdroid, modrinth), social (discord, reddit, bluesky, x, mastodon, lemmy, matrix, discourse, stackexchange, hackernews, youtube, twitch [disabled], wakatime, ...), funding (opencollective, liberapay, sponsors), quality (codecov, coveralls, sonar, weblate), stateful (static/dynamic `badge.ts`, `memo.ts`, `views.ts`).
- **Infrastructure** — `src/cache.ts` (two-tier LRU + optional Upstash Redis, per-provider backoff, token-bucket budgets, stale-serve), `src/provider-fetch.ts` (8s timeout wrapper, used by 43/55 providers), `src/token-pool.ts` (GitHub OAuth token pool, Postgres, AES-256-CBC), `src/db.ts` (pg pool + retry), `src/migrate/` (shields.io transformer), `src/format.ts`. Tests: 15 vitest files, mostly renderer/route; only 2 of ~55 providers covered.

### `packages/web` — Next.js 16 site (Vercel)

- **Pages** — `/` landing + badge builder; `/studio` (Figma-style block editor with undo/redo, localStorage autosave, tiptap rich text, Markdown export `lib/studio-shared.ts`, README import `lib/studio-import.ts`); `/gen` + `/gen/profile` (README generators); `/showcase` (+ community submit → bot PR); `/gallery` (redirect); `/header`, `/sponsors`, `/contributors` builders; `/sponsor` pitch page; `/migrate` (shields.io migration → GitHub App PR); `/token-pool` (OAuth donation); `/privacy`; `/docs/[[...slug]]` (~90 Fumadocs MDX pages); 7 internal `/dev/*` preview pages.
- **API routes** — `app/[...slug]/route.ts` (badge catch-all → core + Sentry + OpenPanel), `api/showcase` (PR creator), `api/migrate/{check,pr}`, `api/gen-{count,users,inspect}`, `api/auth/github{,/callback}`, `api/og/docs`, `api/markdown` (llms.txt), OpenPanel proxy, shadcn registry `app/r/[name]`, 7 `.well-known/*` agent-discovery routes.
- **Components** — four builders + `lib/*-builder-shared.ts`; pickers (`logo-picker`, `color-input`, `svg-icon-upload`); badge display (`badge-preview`, `badge-modal`, `badge-group-modal`, sandboxes); site chrome (`site-header`, `sidebar`, `footer`, `mobile-nav`, `theme-switcher`); `tour.tsx` onboarding; shiki code blocks; 24 shadcn primitives.

### `packages/engine` — self-hosted Docker badge API

- `app/[...slug]/route.ts` (thin core wrapper + Sentry), `app/api/health` (pool stats), `app/api/auth/github{,/callback}` (token-pool OAuth), `app/api/gen-count`, minimal landing page. 3-stage Dockerfile (node:22-alpine, non-root, standalone output), docker-compose with postgres:17 sidecar, Sentry instrumentation (inert without DSN), self-hosting README.

### `packages/cli` — `shieldcn-cli` (citty + consola)

- Default command: scan local dir or remote GitHub repo (`src/detect.ts`, 649 lines), emit badge markdown/flat/html/json (`src/output.ts`), `--inject` between `<!-- shieldcn-start/end -->` markers, `--copy` clipboard. `shieldcn migrate` (shields.io URL conversion), `shieldcn init` (marker insertion).

### Repo infrastructure

- CI: `commit-check.yml` (conventional commits), `docker-publish.yml` (engine image on `engine@*` tags), `labeler.yml`. Husky pre-commit (web-only lint-staged), commit-msg, pre-push (branch lint). `skills/shieldcn-badges/` agent skill. **No CI job runs tests, typecheck, or builds.**

---

## 2. Improvements — P0: security & correctness

### Backend (core / engine)

- [x] **B1. Central SSRF guard for user-supplied URL fetches** (M) — done via PR-1.1, `packages/core/src/safe-fetch.ts`
  `getDynamicJsonBadge` (`packages/core/src/providers/badge.ts:168`), the `/https` proxy (`route-handler.ts:1490`), chart `?url=` (`route-handler.ts:3070`), header `?logo=`/`?image=` (`route-handler.ts:2085, 2166` — these even allow plain `http://`), and instance-host providers (`discourse.ts:19`, `mastodon.ts:17`, `lemmy.ts:17`, `matrix.ts:27`, `weblate.ts:26`, `sonar.ts:24`) all fetch attacker-controlled hosts with no private-IP/localhost/metadata-endpoint/redirect checks. Add one shared `safeFetch` (deny RFC1918, link-local, loopback, cloud metadata IPs; cap redirects; enforce https where possible) and apply at every call site.

- [x] **B2. Remove the silent weak-key fallback for token-pool encryption** (M) — done via PR-1.2
  `packages/core/src/token-pool.ts:85-88` derives the AES key from `GITHUB_OAUTH_CLIENT_SECRET || GITHUB_TOKEN || "shieldcn-dev-key"`. A deployment can silently encrypt donated tokens with a public constant, and key rotation bricks all stored tokens undetectably. Support an explicit `TOKEN_ENCRYPTION_KEY` env var and fail loudly in production when no real key is set. Document in engine README (see B16).

- [x] **B3. Fix `ssl: { rejectUnauthorized: false }` in db pool** (S) — done via PR-1.2 (`ssl: true`)
  `packages/core/src/db.ts:38` disables TLS cert verification for any connection string containing "neon"/"railway"/"supabase" — a MITM vector. Use proper CA verification (`sslmode=require` with system CAs works for all three hosts).

- [x] **B4. Cap response sizes on user-controlled fetches** (S) — done via PR-1.1 (`safeFetch`'s `maxBytes`, applied to header logo/image too)
  `response.json()` is unbounded in the dynamic JSON badge (`badge.ts:196`), `/https` proxy (`route-handler.ts:1506`), and chart JSON (`route-handler.ts:3077`); `JSON.stringify(first)` (`badge.ts:209`) can serialize a huge object. Header images already cap at 4 MB — apply the same byte-cap pattern to these paths.

- [x] **B5. Wrap `handleBadgePUT` in try/catch and validate input** (S) — done via PR-1.4
  Unlike `handleBadgeGET` (`route-handler.ts:3143`), the PUT path has no error wrapper; `decodeURIComponent(slug[2])` (`route-handler.ts:3795-3797`) throws `URIError` on malformed `%` sequences → unhandled 500. Add the wrapper plus length limits on key/label/value.

- [x] **B6. Fix memo badge ownership bugs** (S) — done via PR-1.4, verified against a real Postgres
  In `packages/core/src/providers/memo.ts`: (a) the `ON CONFLICT DO UPDATE` upsert (:94-101) never updates `token_hash`, so after expiry-takeover the new owner's next PUT is rejected; (b) the check-then-write at :85-101 is a TOCTOU race — collapse into one conditional upsert with `WHERE token_hash = $n OR expires_at < NOW()`; (c) `DELETE ... WHERE expires_at < NOW()` runs on **every GET** (:49) — make it probabilistic like token-pool's `CLEANUP_PROBABILITY`; (d) `String(e)` (:106) leaks internal error detail to API responses.

- [x] **B7. Rate-limit / bound public write + expensive endpoints** (M) — done via PR-1.3 (`memo` PUT + `gen-count` POST; PNG/GIF GET intentionally left alone, see plan notes)
  Zero inbound rate limiting exists anywhere. `POST /api/gen-count` (web and engine — identical routes) accepts unauthenticated, unbounded `count` increments; `PUT /memo/...` writes to Postgres; PNG/GIF rendering is CPU-heavy. Cap the `count` payload, and add a token bucket (in-memory for engine, Redis-backed on web where Upstash is already available) for PUT/POST paths.

- [x] **B8. Cap and validate `/group` badges** (S) — done via PR-1.5
  `rawPath.split("+")` (`route-handler.ts:1642`) has no segment limit — one URL fans out to arbitrarily many parallel upstream fetches (DoS amplification). Also the group path casts the style directly (`as BadgeStyle`, :1668) instead of validating via `resolveVariant` like the single-badge path (:3300-3304). Cap at ~10 segments and reuse `resolveVariant`.

- [x] **B9. Verify svg-parser attribute passthrough for user SVG data URIs** (S) — audited via PR-1.5: confirmed safe by construction (allowlist extractor), locked in with 19 adversarial tests
  `?logo=data:image/svg+xml...` content flows through `packages/core/src/badges/svg-parser.ts` into `render.tsx:499-576`. Sandboxed `<img>` mitigates script execution, but the badge SVG is also served raw when opened directly. Confirm the parser only emits path/shape elements and strips `on*`/`href`/`style` attributes; add tests locking that in.

- [x] **B10. Fix `docker-publish.yml` workflow_dispatch tagging bug** (S) — done via PR-1.6 (`version` input required, `latest` gated to real tag pushes)
  On manual dispatch, `${GITHUB_REF_NAME#engine@}` yields the branch name (e.g. `main`), so a dispatch from a branch overwrites `engine:latest` and pushes a bogus `engine:main` tag. Guard `latest` behind tag refs only, or take the version as a dispatch input.

- [x] **B11. Make `/api/health` actually reflect health** (S) — done via PR-1.6, verified against real Postgres (live server, both up and down)
  `getPoolStats()` (`token-pool.ts:255-278`) swallows all errors and returns zeros, so `packages/engine/app/api/health/route.ts` reports `ok: true` with Postgres down and the Docker healthcheck can never fail. Add a cheap DB ping and return 503/degraded state.

### Frontend (web)

- [x] **F1. Rate-limit the PR-creating POST endpoints** (M) — done via PR-1.3 (shared limiter with B7)
  `app/api/showcase/route.ts` and `app/api/migrate/pr/route.ts` create real branches/PRs on the repo with only field-length validation (`showcase/route.ts:107-113`) and no rate limiting — a script can spam the repo with bot PRs. Add Redis-backed throttling (Upstash env already wired via turbo.json) + per-IP caps. (Overlaps B7; implement as one shared limiter.)

---

## 3. Improvements — P1: reliability, performance, testing, a11y

### Backend (core / engine / infra)

- [ ] **B12. Add a real CI workflow: tests, typecheck, lint, builds** (S)
  Core has a 15-file vitest suite that no workflow ever runs — only commit-lint and the labeler run on PRs. Add `ci.yml`: `pnpm install`, `turbo build lint`, `vitest run` in core, `tsc --noEmit` in cli/engine. Also add `test`/`typecheck` tasks to `turbo.json` and lint scripts to engine (root `lint-staged` currently covers only `packages/web/**`).

- [x] **B13. Build the engine Docker image on PRs touching engine/core** (S) — done via PR-5.8 (paths-filtered pull_request trigger builds without pushing)
  `docker-publish.yml` only fires on `engine@*` tags, so a broken `packages/engine/Dockerfile` (fragile glob COPY of `@resvg+resvg-wasm@*` at ~line 36) is only discovered at release time. Add a `push: false` build job with path filters.

- [x] **B14. Route dynamic/https badges through the cache/backoff layer** (S) — done via PR-1.1 (dynamic badge uses `cachedFetchStale`, `/https` uses `cachedFetch`)
  The dynamic JSON badge and `/https` proxy call raw `fetch` per request (`badge.ts:168`, `route-handler.ts:1493`) with no `cachedFetch`, backoff, or budget — unlike every registry provider. A hot README hammers the third-party endpoint on every CDN miss. Wrap in `cachedFetch("dynamic", url+query, ...)`.

- [x] **B15. Deduplicate the 5 resvg-wasm init blocks and pin the wasm URL** (S) — done via PR-2.1, verified with real PNG byte-level tests
  Identical ~25-line init logic at `route-handler.ts:1807-1830, 2005-2027, 2203-2225, 2817-2839, 3722-3747` (`rasterizeToPng` at :2202 exists but is only used by sponsors/contributors). Each PNG request re-runs `fs.existsSync`/`readFileSync`, and the CDN fallback fetches **unversioned** `https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm` which can drift from the installed `^2.6.2` bindings. Extract one memoized `ensureResvg()` with a versioned URL.

- [x] **B16. Cache resolved icons in `simple-icons.ts`** (S) — done via PR-2.2, bounded LRU keyed by slug
  Every `?logo=ri:FaReact` badge re-runs `import("react-icons/fa")` + `renderToStaticMarkup` per request (`packages/core/src/badges/simple-icons.ts:59, 92-120`) with no memoization — this is the hot path for every badge with a non-default logo. Add a module-level LRU keyed by slug+color.

- [x] **B17. Store a token hash column in the token pool** (M) — done via PR-2.3, verified against real Postgres including the ON CONFLICT hash-staleness bug and legacy-row fallback
  `invalidateToken` (`token-pool.ts:215-234`) selects and decrypts **every** valid token row to find a match; the code comment itself says "Better approach: store a hash of the plaintext for lookup." Add an indexed `token_hash` column (sha256 helper already exists at :112) and invalidate with one UPDATE.

- [x] **B18. Share backoff/budget state via Redis on serverless** (M) — backoff done via PR-2.4 (Redis-mirrored, tested with real cross-instance simulation); `consumeBudget`'s token bucket intentionally left for a future PR (needs an atomic Lua script for correctness, see plan notes)
  Backoff windows and token-bucket budgets are per-instance in-memory Maps (`cache.ts:61, 137`), so N concurrent lambdas allow N× the configured upstream rate and a 429 on one instance doesn't protect the others. When the Redis tier is configured, mirror `recordBackoff`/`isBackedOff` there. Also prune the unbounded `staleAlerted` set (`cache.ts:372`).

- [x] **B19. Encode path params consistently in providers; guard missing API keys** (S) — done via PR-2.5 (~45 provider files encoded, several extra gaps found beyond the original list; regression test in `src/providers/url-encoding.test.ts`)
  `starhistory.ts:107` interpolates `owner`/`repo` un-encoded (github.ts encodes); ~19 provider files use no `encodeURIComponent` at all (discord, docker, opencollective, packagist, reddit, skills, weblate, youtube, ...), letting crafted segments alter the upstream path/query. Also `youtube.ts:28ff` interpolates `key=${API_KEY}` without checking the env var — return null early with a clear "config missing" verdict.

- [x] **B20. Expand core test coverage to the risk-bearing modules** (L) — done via PR-4.1 (badge.ts parsing fully covered; memo/svg-parser already had coverage; the registry smoke test was attempted and dropped as unworkable without per-provider fixtures — see PR-4.1 notes and new item **B23**)
  Only 2 of ~55 providers are tested; no tests for `token-pool.ts`, `memo.ts`, `views.ts`, `render-group.tsx`, `render-sponsors.ts`, `simple-icons.ts`, `svg-parser.ts`, `animate.ts`, `gif.ts`, `validate.ts`. Highest value first: static/dynamic badge parsing (`badge.ts` — pure functions), memo auth flows, svg-parser (security-relevant), and a table-driven provider smoke test using the example paths already declared in `registry.ts`.

- [x] **B21. Add startup env validation to the engine** (S) — done via PR-1.6, verified live (booted with `DATABASE_URL` unset, confirmed the warning)
  Nothing validates `DATABASE_URL` (documented as required) or warns on OAuth half-configuration — client ID without secret only 503s at callback time (`app/api/auth/github/callback/route.ts:32-36`). Add a register-time check in `instrumentation.ts` with clear log output.

- [x] **B22. Add tests for CLI and engine routes** (M) — done via PR-4.2 (vitest wired up in both packages for the first time; `inspectLocal`/`inspectRemote`'s network-heavy paths left for a narrower follow-up, see PR-4.2 notes)
  Zero tests outside core. Highest value: `packages/cli/src/migrate.ts` (173 lines of regex URL conversion), `src/inject.ts` (destructive file writes between markers), `src/detect.ts` parsing, and the engine OAuth callback state/scope validation (`app/api/auth/github/callback/route.ts:60-75`) which guards the token pool.

- [ ] **B23. Real per-provider smoke tests with response fixtures** (L)
  PR-4.1 attempted a table-driven smoke test over every `registry.ts` example path with the network mocked to fail closed, on the theory that a genuinely-dispatched provider degrades a failure into its own error badge (distinguishable from the generic "not found" used for an undispatched/drifted path). It doesn't work: most of the ~30 providers simply `catch { return null }` on any fetch error, which is indistinguishable from "not found" — only `github.ts`'s more elaborate last-known-good/`GITHUB_UNAVAILABLE` handling produces a distinguishing non-null result under total network failure. Doing this properly needs a small realistic response fixture per provider (mocking `fetch` to return the shape each API actually sends, not just fail/succeed-empty) so the assertion can be "extracts a real, non-error badge value," which would also incidentally catch response-shape drift in the providers themselves. Real, separate effort — not a table-driven sweep that can share one mock.

### Frontend (web)

- [x] **F2. Add route-level `loading.tsx` / `error.tsx` / `not-found.tsx`** (M) — done via PR-3.1
  Zero exist in the entire `app/` tree; only `app/global-error.tsx` catches crashes. Async server pages (`app/token-pool/page.tsx:24` awaits `getPoolStats()`, `/showcase`) render nothing while fetching, and throws fall to the bare global error. Add loading skeletons for `/`, `/showcase`, `/gen`, `/token-pool`, `/docs`, plus a branded `not-found.tsx`.

- [x] **F3. Honor `prefers-reduced-motion` in the remaining motion components** (M) — done via PR-3.2; surfaced a new gap, see F11
  Only 4 of 12 motion-importing files use `useReducedMotion`. `hero-entrance.tsx:30`, `hero-showcase.tsx`, `sponsor-button.tsx:14`, `sponsor-entrance.tsx`, `theme-switcher.tsx:5`, `tour.tsx:3`, `site-announcement.tsx`, `animated-header.tsx`, `fancy/text/underline-to-background.tsx` run JS spring animations the global CSS override (`app/globals.css:249-256`) cannot suppress. Direct PRODUCT.md WCAG commitment violation.

- [ ] **F11. `useReducedMotion()` consumers hydration-mismatch for real reduced-motion users** (M) — the proposed fix's building block now exists (`lib/use-hydrated.ts`, added in PR-5.11), but it has NOT yet been applied to the 12 `useReducedMotion` call sites; that wrapping is the remaining work.
  Discovered while verifying F3 with `prefers-reduced-motion` emulated in a real browser: Motion's `useReducedMotion()` reads `matchMedia` synchronously on its very first render (confirmed in `framer-motion`'s source), so a user who already has OS reduce-motion enabled *before* the page loads gets `reduce: true` on the client's first render — but SSR has no way to know that and always renders the non-reduced baseline, producing a hydration mismatch (React error #418) on every page load for that entire user segment. Affects the 3 pre-existing consumers (`app/template.tsx`, `sidebar.tsx`, `studio.tsx`) plus the 9 added in PR-3.2. React recovers gracefully (discards the mismatched SSR subtree, re-renders client-side — confirmed the final rendered page is visually correct), so it's not broken UX, just a wasted render pass + console noise. Proper fix: a `useHydrated()`-gated wrapper so every consumer's first client render always matches SSR (accept a one-frame "flash of un-reduced motion" for that user segment on load), applied consistently across all 12 call sites.

- [x] **F4. Keyboard-accessible block reordering + resize in Studio** (S) — done via PR-3.3
  `components/studio/canvas.tsx:406-421` handles Enter/Space/Delete but reordering is pointer-drag only (:470-477) — `moveBlock(from, to)` already exists at `studio.tsx:370`; wire Alt/Cmd+ArrowUp/Down on the focused BlockFrame. Also the image-resize `role="slider"` at `canvas.tsx:199-204` has `tabIndex={-1}` and no arrow-key handling or `aria-valuenow/min/max`.

- [x] **F5. Fix label association and icon-button names in builders** (S) — done via PR-3.3 (header/sponsors/contributors builders + LogoPicker trigger; variant-preview and disclosure buttons were already correctly labeled)
  Several `<Label>`s lack `htmlFor`/`id` linkage (`header-builder.tsx:197-212` and sponsors/contributors equivalents); the variant-preview image buttons (`badge-builder-core.tsx:508-526`) and reset/advanced disclosure buttons (:546-550) need explicit `aria-label`s.

- [x] **F6. Add a web test suite** (L) — done via PR-4.3 (vitest + jsdom wired up; `gen/detect.ts`'s network-heavy `inspect()` orchestration left uncovered, same scoping decision as PR-4.2's CLI equivalent)
  `packages/web` has zero tests/config. Highest-value targets: `lib/studio-shared.ts` (Markdown export fidelity — the product's core promise), `lib/studio-import.ts` (README parsing), builders' output formatting, `lib/gen/detect.ts`.

- [x] **F7. Surface silent failures to users (add a toast primitive)** (S) — done via PR-3.4 (gen-count/gen-users deliberately report to Sentry instead of a toast, see notes)
  Clipboard writes swallow errors via `.catch(() => {})` in all builders (`badge-builder.tsx:98`) and `generator-client.tsx:275, 284`; `api/gen-count`/`gen-users` POSTs fail with no feedback. No toast primitive exists in `components/ui/` — add one (shadcn sonner) and wire it in.

- [x] **F8. Extract shared copy-output module for the four builders** (M) — done via PR-3.5
  `formatOutput()`, `COPY_FORMATS`, and the `handleCopy` pattern are copy-pasted with drifted signatures across `badge-builder.tsx:30/90`, `header-builder.tsx:47/92`, `sponsors-builder.tsx:44/110`, `contributors-builder.tsx:44/110`; `badge-modal.tsx:37-40` and `badge-group-modal.tsx:38-41` duplicate SIZES/THEMES/MODES constants and copy UI. Extract `lib/builder-output.ts`, a `CopyOutputSection` component, and a `useCopyToClipboard` hook. While there, fix the hydration-unsafe baseUrl in `badge-builder.tsx:74` (setState-in-effect) by standardizing on the `useSyncExternalStore` pattern the other three builders use (`header-builder.tsx:76-80`).

- [x] **F9. Defer non-critical motion imports on the landing path** (M) — done via PR-3.6 (tour + sidebar; hero/header deliberately left eager, see notes — they're first-paint content, not deferrable)
  `motion/react` is imported eagerly at module top in `sidebar.tsx:6` (site chrome on every page), `hero-entrance.tsx`, `sponsor-button.tsx`, `tour.tsx`, `theme-switcher.tsx`. Use `next/dynamic` for the tour and hero choreography, or motion's `LazyMotion`/`m`, to cut the shared client bundle.

- [x] **F10. Studio: project export/import + safe Reset** (M) — done via PR-3.7
  Persistence is a single localStorage slot (`studio.tsx:114, 275`); Reset clears document and history (:485) with no confirmation or backup, and there's no way to save/share drafts. Add "Download/Load project (.json)" next to the Markdown export (:519-524) and make Reset confirmed or undo-able.

---

## 4. Improvements — P2: polish, hygiene, docs

- [x] **P1. Guard or noindex the `/dev/*` pages in production** (S) — done via PR-5.2; found a broader pre-existing 404-status-code issue along the way, logged as **P18**
  7 pages under `app/dev/` ship to prod with no `NODE_ENV` guard or `robots: noindex` (robots.txt disallows them but they're reachable); `app/dev/preview/page.tsx` pulls `html-to-image` into the prod bundle. Return `notFound()` outside development.

- [x] **P2. Add missing routes to the sitemap; add web manifest + theme-color** (S) — done via PR-5.1
  `app/sitemap.ts:30-41` omits `/contributors`, `/sponsors`, `/privacy`. No `manifest.webmanifest` or `theme-color` meta in `app/layout.tsx` despite icons existing.

- [x] **P3. Remove dead code in core** (S) — done via PR-5.3
  Unused `pkg` computation with a baffling slice at `route-handler.ts:514`; `getCocoaPodsPlatform` fetches then returns hardcoded `"ios | macos"` (`cocoapods.ts:63-69`); legacy `src/github.ts` duplicates providers/github.ts + format.ts (`formatStarCount` is `@deprecated`); `KNOWN_PARAMS` in `normalize-params.ts:25` is documented as stripping unknown params but never used — the doc lies about behavior.

- [x] **P4. Resolve the disabled Twitch provider** (S) — done via PR-5.4 (re-enabled end-to-end; also fixed a real routing bug found while uncommenting it, and a pre-existing unrelated test-timeout flake found while verifying)
  Provider is fully written but dead behind commented-out routing (`route-handler.ts:1081-1089`), and the builder option is commented out (`packages/web/lib/badge-builder-shared.ts:80` TODO). Either env-gate/re-enable it end-to-end or delete both sides.

- [x] **P5. Deduplicate cross-file render helpers** (M) — done via PR-5.5 (5 shared modules/exports; render-chart's spaced-rgba kept separate by design, see notes)
  `luminance`/`rgba` (render.tsx:82-157 vs render-group.tsx:75-84), `esc`/`r2`/`clamp` redefined in render-chart.ts:174 / render-header.ts:58 / render-sponsors.ts:101, `findFontsDir` (render.tsx:38 vs render-group.tsx:32), `isRateLimitResponse` (github.ts vs starhistory.ts), coverage→color mapping (codecov.ts vs coveralls.ts), `formatCount` implemented twice (`src/format.ts:15` and `src/github.ts:68`). Consolidate into shared utils.

- [x] **P6. Extract shared badge-route glue from web/engine into core** (S) — done via PR-2.6 (`createBadgeHandlers()`; also fixed `handleBadgePUT` never accepting `onError`/`onMetric` in either app, not just engine)
  `packages/engine/app/[...slug]/route.ts` and `packages/web/app/[...slug]/route.ts` contain byte-identical `reportBadgeError`/`emitMetric` implementations; engine's PUT doesn't pass `onError`/`onMetric` while its GET does (likely an oversight). A `createBadgeHandlers({onTrack?})` factory in core kills the drift.

- [x] **P7. Replace unchecked `as` casts on upstream JSON with safe accessors** (M) — done via PR-2.6 (`str()`/`num()` in `provider-fetch.ts`; also applied to discord.ts and twitch.ts casts found in the same sweep)
  E.g. `(d.license as Record<string,unknown>)?.spdx_id as string` (`github.ts:287`), `meta.stargazers_count as number` (`starhistory.ts:145`), `lastPage["@id"] as string` fed back into fetch (`nuget.ts:42`), `data.url as string` (`mastodon.ts:34`). A tiny `str()`/`num()` coercion helper in `provider-fetch.ts` eliminates the "[object Object]"/NaN badge class when upstream schemas shift.

- [x] **P8. Bound badge dimension overrides at the renderer** (S) — done via PR-2.6 (`BADGE_DIM_BOUNDS`/`clampBadgeDim()`, satori() wrapped with a non-recursive error-badge fallback)
  The route clamps numeric params (`route-handler.ts:3560-3577`) but `renderBadge`/`renderBadgeGroup` accept `height`/`fontSize`/`iconSize` unchecked (`render.tsx:258-268`), so other callers (engine, future endpoints) can pass `height: 1e9` into Satori. Mirror the clamps in the renderer and wrap the `satori()` call (:405) to degrade to `renderErrorBadge`.

- [x] **P9. De-duplicate hardcoded versions** (S) — done via PR-5.6 (both import from package.json; verified CLI --version and engine /api/health)
  Engine health route hardcodes `version: "0.0.1"` (`app/api/health/route.ts:15`) vs its package.json; CLI hardcodes `const version = "1.0.0"` (`src/bin.ts:24`). Import from package.json or inject at build (tsup `define`).

- [x] **P10. Add npm release automation for the CLI; stop committing `dist/`** (M) — done via PR-5.7 (tag-triggered publish workflow w/ provenance; dist/ untracked + gitignored; requires NPM_TOKEN secret)
  `shieldcn-cli` has no publish workflow and `packages/cli/dist/bin.js` is tracked in git (guaranteed staleness vs `src/`). Add a tag-triggered `npm publish --provenance` workflow mirroring `docker-publish.yml`; gitignore `packages/cli/dist`.

- [x] **P11. Fix commit-rule drift between husky and CI** (S) — done via PR-0.2; checkbox was left unticked at the time, corrected here
  `.husky/commit-msg` accepts `perf`/`build`/`revert` but `commit-check.toml` omits `perf` and `build` — locally-valid commits fail CI. Branch-type lists also differ (`commit-check.toml [branch]` lacks `docs/refactor/style/test/perf/ci/build` that `.husky/pre-push` allows). Align both.

- [x] **P12. Harden Docker image + workflow supply chain** (M) — done via PR-5.8 (base digest pin, HEALTHCHECK, amd64+arm64, SBOM + provenance; action SHA-pinning left to Dependabot-managed tags — see PR-5.8 notes for why hand-typed SHAs were declined)
  Pin `node:22-alpine` by digest, add a `HEALTHCHECK` instruction to the Dockerfile itself (only compose defines one today), build `linux/amd64,linux/arm64` (ARM self-hosters currently can't run the image), SHA-pin workflow actions, add SBOM/provenance attestation.

- [x] **P13. Add Dependabot/Renovate config** (S) — done via PR-0.3; checkbox was left unticked at the time, corrected here
  Root package.json carries seven manual security `pnpm.overrides` — evidence patching is manual. Add `.github/dependabot.yml` covering npm (workspace), github-actions, and docker.

- [x] **P14. Make Sentry sample rates configurable in the engine** (S) — done via PR-5.9 (SENTRY_TRACES/PROFILES_SAMPLE_RATE env vars, default 0.1, clamped)
  `packages/engine/sentry.server.config.ts` hardcodes `tracesSampleRate: 1` and `profilesSampleRate: 1` — expensive at badge-service request volumes. Read from env with defaults ~0.1.

- [x] **P15. Fill engine README/env-doc gaps** (S) — `TOKEN_ENCRYPTION_KEY`/`SHIELDCN_ALLOW_PRIVATE_FETCH` done via PR-1.2; the rest (Sentry DSN env var, OAuth/gen-count endpoint docs, postgres credential warning) finished during Phase 5 hygiene pass
  Env table omits `NEXT_PUBLIC_SENTRY_DSN` (compose passes it); OAuth token-pool endpoints and `/api/gen-count` are undocumented; quick-start ships `shieldcn:shieldcn` postgres credentials with no "change this" note; document the token-encryption key behavior (see B2).

- [~] **P16. Split the two monolith client files** (M) — partially done via PR-5.10: extracted the duplicated badge-preset logic (shared between inspectors.tsx and badge-builder-core.tsx, with a divergent `findMatchingPreset` regex bug) into a tested `lib/badge-preset-match.ts`, resolving the real coupling debt and fixing the bug. The raw per-block-type JSX file split is deferred as **P19** — it yields no bundle benefit without a separate next/dynamic conversion and is high-churn on untested UI (see PR-5.10 notes).
  `components/studio/inspectors.tsx` (1,387 lines — all block inspectors in one client file) and `app/gen/generator-client.tsx` (1,068 lines with five "Pre-existing react-compiler debt" comments at :72, :82, :132, :158, :239). Split per block type / extract generator sections for maintainability and per-inspector code-splitting.

- [ ] **P19. Per-block-type file split of the studio inspectors + generator (editor readability)** (M)
  Follow-up to P16 (PR-5.10 handled the duplicated-logic half). `inspectors.tsx` and `app/gen/generator-client.tsx` remain large single files. A file split is editor-readability only — it yields NO bundle savings on its own because every inspector is statically imported and conditionally rendered by `studio.tsx`. To get the real code-splitting win, pair the split with `next/dynamic(() => import(...), { ssr: false })` per inspector (accepting the added loading states) so each block type's editor panel is a separate chunk fetched on first selection. Do them together or not at all — the split alone isn't worth the churn on untested UI.

- [ ] **P18. `notFound()` serves 200, not 404, site-wide under `next start`** (M)
  Discovered while gating `/dev/*` (PR-5.2, generalizing a narrower case already flagged in PR-3.1's notes): any route whose page calls `notFound()` — including genuinely unmatched paths like `/this-does-not-exist-xyz` with no matching route at all — renders the correct "Page not found" content but is served with HTTP `200`, not `404`. Reproduces with a stock `next build && next start`, unrelated to any backlog change. Likely an interaction between `middleware.ts`'s `NextResponse.next()` passthrough (it runs on every non-asset route per its matcher) and how Turbopack serves prerendered not-found output — needs isolating whether the middleware is stripping/overriding the status, or if it's a Next 16 static-notFound serving quirk independent of middleware. Wrong status code affects crawler/monitoring signals (search engines and uptime checks that key off status rather than content will misclassify these as healthy 200s) even though `robots.txt` already keeps `/dev/*` out of the crawl.

- [ ] **P20. Site-wide `SyntaxError: Unexpected identifier 'not'` in the browser console** (S)
  Observed throughout Phase 3–5 live verification: every page (home, /studio, /showcase, …) logs one or two `Uncaught SyntaxError: Unexpected identifier 'not'` on load. It does NOT originate from app code — the production build compiles and runs, and the error reproduces on a bare page load with zero interaction and with none of this backlog's changes applied. Most likely an injected/third-party script (analytics loader, a browser-extension-style inject, or a malformed inline snippet) the browser fails to parse. Harmless to rendering (all pages verified visually correct) but pollutes the console and any client error reporting. Track down the source (check the OpenPanel/analytics script tags, any inline `<script>` in the layout, and the middleware-injected headers) and fix or remove it.

- [x] **P17. Pay down pre-existing web lint debt; make `pnpm lint` a hard CI gate** (M) — done via PR-5.11: all errors/warnings fixed by root cause (useHydrated hook for the mounted-gate class, useSyncExternalStore for localStorage reads, render-phase reset for mobile-nav, onLoad natural-width for canvas refs, static motion.span for underline, a real tour ordering-bug fix, links/vars cleanup); only two legitimate effect-setState cases (tour DOM measurement, migrate install-resume) kept as justified scoped disables. CI Lint step flipped to a hard gate. Created the `useHydrated` hook that **F11** proposed (F11's own remediation — wrapping the useReducedMotion consumers — remains open).
  Discovered while wiring CI (B12): `cd packages/web && eslint .` reports 17 errors / 9 warnings on unmodified `main` — none introduced by this backlog. Root `lint-staged` only lints staged files on commit, so historical files were never swept. Breakdown: ~12 files trip `react-hooks` "Calling setState synchronously within an effect can trigger cascading renders" (`components/mobile-nav.tsx:15`, `badge-card.tsx:19`, `badge-marquee.tsx:49`, `group-showcase.tsx:29`, `hero-icon-cloud.tsx:32`, `github-star-cta.tsx:31`, `animated-showcase.tsx:59`, `analytics.tsx:16`, `app/migrate/migrate-client.tsx:102`, `components/tour.tsx:143`, plus 2 more); `components/fancy/text/underline-to-background.tsx:111` trips "Cannot create components during render"; `components/tour.tsx:162` trips "Cannot access variable before it is declared" and a related "Compilation Skipped: Existing memoization could not be preserved" at `:217`; `components/animated-showcase.tsx:68` and `components/token-pool/page.tsx:121` use `<a>` instead of `next/link` for internal navigation; a handful of unused-var/unused-expression warnings round it out. Fix each (each setState-in-effect case likely needs the state derived during render or the update deferred, not a blanket suppression), then flip the CI `Lint` step (`.github/workflows/ci.yml`) from `continue-on-error: true` to a hard gate. **Do not silence these with eslint-disable — several flag real timing bugs, not false positives.**

---

## 5. Suggested execution order

1. **B12 (CI)** first — everything after it lands with a safety net.
2. P0 security batch: B1–B9 in core (mostly independent; B1+B4+B14 touch the same fetch paths and combine well), B10–B11, F1/B7 as one rate-limiting change.
3. P1 reliability/a11y: F2, F3, F4/F5, B14–B19, B21.
4. Test debt: B20, B22, F6 (large; can proceed in parallel with P2 items).
5. P2 hygiene batch in any order; P5/P6/P8 pair naturally with render work, P9–P15 are quick wins.

Overlaps to implement once, not twice: the encryption-key fix (B2) and its docs (P15); rate limiting (B7 + F1) as one shared limiter; Twitch (P4) spans core + web.
