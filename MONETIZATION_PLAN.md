# shieldcn Plus & Pro — Plan

Two paid tiers via Polar.sh, framed as "support shieldcn" as much as product:

- **Plus — $8/mo (individuals/maintainers):** saved READMEs in the Studio
  (start at 2), mass shields.io migration across all your repos, AI assists
  (README generation/polish, badge suggestions).
- **Pro — $30/mo (companies/teams):** everything in Plus, plus managed brand
  assets + README badges/headers from one dashboard, embedded anywhere (own
  site, READMEs, npm, docs), with built-in analytics and team seats.

Core promise: **change your brand once, every distributed asset updates** —
all badge logos, all README headers, all embeds, everywhere, on next fetch.
No PRs across 40 repos when the company rebrands.

Free tier stays free (public badges, query-param styling, the growth engine).
What's paid: stored brands, hosted brand assets, the dashboard, analytics.

---

## Stack decisions (locked)

| Concern | Choice | Why |
|---|---|---|
| Auth | **Neon Auth** (Stack Auth, `@stackframe/stack`) | DB is already Neon-ready (`db.ts` special-cases Neon SSL). Users sync into `neon_auth.users_sync` in the same Postgres — brand ownership is a plain FK, no webhook user-sync plumbing. Stack Auth Teams = company accounts out of the box. |
| Billing | **Polar.sh** (`@polar-sh/nextjs`) | Merchant of record (handles global tax), checkout + customer portal + webhooks, positions naturally as "support the project" — closer to sponsorship than Stripe. |
| Analytics store | OpenPanel (existing) for firehose + **Postgres rollup table** we own for the dashboard | Dashboard queries need to be ours; OpenPanel alone can't serve per-brand tenant queries cheaply. |
| Plan shape | **Free / Plus $8 / Pro $30**. Free = 0 saved READMEs, 0 brands. Plus = individual (Studio saves, mass migration, AI). Pro ⊇ Plus + brands/assets/analytics/teams. | Plus fills the $0→$30 gap for maintainers; Pro stays the company pitch. Team seats via Stack Auth Teams (fair-use, no per-seat billing at launch). |
| Entitlements | Single `getPlan(teamId) → "free" \| "plus" \| "pro"` helper (cached), driven by Polar webhooks. | One check everywhere; upgrading Plus→Pro is just a Polar product change. |
| Usage limits | **Polar Usage-Based Billing**: Meters + event ingestion via `@polar-sh/ingestion`, credits granted per tier as a Polar benefit. | Polar owns metering, balances, and overage — no homegrown usage tables to reconcile with billing. |

---

## Phase 0 — Copy cleanup (do immediately, independent of everything)

Remove every promise to never charge. Reframe: *badges are free forever; Pro
is how companies support the project and manage their brand.*

1. `packages/web/app/sponsor/page.tsx`
   - line ~384 hero: `I'll never charge, but if you want to help` → e.g.
     "Badges are free. If shieldcn earns your support…"
   - line ~389: `All of it is free, and that part isn't changing.` → scope it
     to public badges specifically.
   - line ~392: `There's no pro tier, and nothing locked behind a
     sponsorship.` → delete/rewrite; once Pro exists, mention it as the way
     companies support the project ("individuals: sponsor; companies: Pro").
   - line ~100 meta description: keep "free, open-source" but drop any
     "for everyone/forever" absolutism.
2. Sweep for stragglers: `rg -i "never charge|free forever|no pro tier|always free|100% free"`
   across `README.md`, `packages/web/content/docs/`, `app/`, OG images.
3. Keep "public badges stay free" as an explicit, prominent commitment — that
   promise we *keep*.

Acceptance: the sweep returns zero hits promising the whole product is free
forever; sponsor page reads correctly both before and after Pro launches.

---

## Phase 1 — Analytics enrichment (unchanged from prior plan, now required)

This becomes the Pro dashboard's data feed, so it moves from "nice" to
prerequisite.

- Add `subject` (owner/repo, package name, etc.) to `badge_rendered` at all
  ~8 `onTrack` sites in `packages/core/src/route-handler.ts`.
- Thread `user-agent` + `referer` into the handler; derive
  `source` ∈ `github-camo | npm | docs | direct` and `refererHost`.
- **New:** when a request resolves a brand (Phase 3), include `brandId` in the
  event — this is the tenant key for the dashboard.
- **New:** Postgres rollup table `badge_stats_daily`
  (`brand_id, subject, provider, source, day, count`) written by the same
  fire-and-forget track path (batched upsert), in core so engine gets parity.
- Document the Camo undercount caveat ("at least N").

Acceptance: OpenPanel events carry `subject`/`source`/`brandId`; rollup table
populates; zero added request latency; no PII (host-only referer, no IPs).

---

## Phase 2 — Auth + billing scaffolding

### Neon Auth (Stack Auth)

1. Enable Neon Auth on the project; install `@stackframe/stack` in
   `packages/web` (`app/handler/[...stack]/` routes, provider in
   `app/layout.tsx`). GitHub as the primary OAuth provider (audience fit;
   token-pool OAuth at `app/api/auth/github` stays separate — it's token
   donation, not login).
2. **Teams = companies.** A brand belongs to a team, not a user. Personal
   accounts get a default team. Stack Auth handles invites/membership UI.
3. Users appear in `neon_auth.users_sync` — FK target for ownership.
4. Engine note: self-hosted engine does **not** get Neon Auth; it reads/serves
   brands only (management happens on the web app, or via its existing basic
   OAuth). Keep all auth code in `packages/web`, never in core.

### Polar.sh

1. Products: "shieldcn Plus" — $8/mo, "shieldcn Pro" — $30/mo (+ optional
   yearly). Upgrade path Plus → Pro via Polar subscription update.
   Each product grants a monthly **credits benefit** (AI + migration meters,
   amounts below) that Polar resets each billing cycle.
2. `@polar-sh/nextjs`: `POST /api/checkout` (Checkout handler),
   `/api/polar/webhook` (subscription created/updated/canceled),
   customer-portal link in the dashboard.
3. Entitlements table in Postgres (core `db.ts` migration):
   `subscriptions (team_id, polar_customer_id, polar_subscription_id, plan
   ('plus' | 'pro'), status, current_period_end)`. Webhook is the source of
   truth; a cached `getPlan(teamId)` helper guards saved-README CRUD (plus+),
   mass migration (plus+), AI routes (plus+, metered), brand-create and
   dashboard analytics (pro).
4. Framing on the pricing/sponsor pages: "Pro keeps shieldcn running — and
   gives your company a managed brand." Individuals are still pointed at
   GitHub Sponsors.
5. Grace handling: subscription lapses → brands and saved READMEs go
   **read-only + keep serving/exportable** (never break shipped READMEs or
   hold work hostage; that's both ethical and the re-subscribe hook). Editing
   requires an active sub.

Acceptance: sign up → create team → checkout → webhook flips entitlement →
`getPlan` correct for both products; cancel → read-only mode; no service
interruption to embeds.

---

## Phase 2.5 — shieldcn Plus (ships before Pro; first revenue)

Plus needs only Phase 2 (auth + billing) — no brand registry — and mostly
wraps features that already exist. It validates the whole Polar/Neon Auth
stack with real customers before the bigger Pro build.

### Saved READMEs (Studio cloud saves)

- The Studio already snapshots its full session for "save my work and resume"
  (`lib/studio-shared.ts`, local). Plus lifts that snapshot to Postgres:
  `studio_documents (id, team_id, name, doc jsonb, updated_at)`.
- **Limit: 2 saved documents** at launch (constant in one place; easy to
  raise, or to add a higher cap later). Free stays local-only single session.
- CRUD at `app/api/studio/docs/[id]`, plan-gated. Studio UI: save/rename/
  open list, "synced" indicator. Local snapshot remains the fallback so
  nothing regresses for free users.
- Later (cheap adds): version history, shareable read-only links.

### Migration becomes Plus-only (retire the free tool)

- Today `/migrate` is a free public tool: one repo → one PR via the GitHub
  App (`app/api/migrate/github-app.ts`). **A free migrate tool undercuts the
  Plus wedge — remove it.**
- Retirement work: gate `/migrate` behind login + Plus (page becomes the
  mass-migration dashboard); update its metadata/copy (currently says "Free
  tool…"); remove/redirect free-tier entry points (landing page, docs,
  sidebar links); keep the GitHub App + scanner + PR plumbing — it's the
  engine of the paid feature. Anonymous scan/preview MAY remain as the
  funnel (see open questions); the PR-opening step is Plus.
- Plus experience: **scan every repo on the account/org**, list all READMEs
  with shields.io badges, side-by-side preview, select-all → open PRs in
  bulk (queued, rate-limit aware; reuse the existing scanner + PR path per
  repo).
- Metered via Polar: `readme_migration` meter, 1 event per PR opened
  (ingested server-side after PR creation). Credits per cycle: Plus 20 PRs /
  Pro 200 PRs (tune later). Balance checked via Polar customer meter before
  enqueueing a batch.
- Also applies a saved brand's styling during migration for Pro users —
  a natural Pro upsell inside the same flow.

### AI assists (metered)

- Scope tightly at launch — two features, both inside the Studio:
  1. **Generate README** — point at a repo (or paste package.json/summary),
     produce a structured Studio document (blocks, not raw markdown — the
     `studio-import.ts` parser already converts markdown → blocks, so the
     model can emit markdown and we import it).
  2. **Polish/rewrite section** — improve a selected Text block's prose.
- Metering: **Polar-native**, not homegrown. Server AI route uses the
  Vercel AI SDK with the model wrapped in `@polar-sh/ingestion`'s
  `LLMStrategy`, which auto-ingests input/output token events per Polar
  customer against an `ai_tokens` meter. Tiers grant monthly credits (Polar
  credits benefit): Plus ~50 generations' worth, Pro ~200 (denominate in
  tokens; tune once real generation sizes are known).
- Pre-flight: check the customer's meter balance via Polar's customer-state
  API before starting a generation; surface remaining credits in the Studio
  and dashboard (Polar customer portal shows the same numbers — no
  reconciliation drift).
- Overage: hard stop at zero balance at launch (upgrade prompt). Optional
  pay-as-you-go overage later — it's a Polar product config change, not code.
- Provider behind a thin server route; never expose keys client-side.

Acceptance: Plus user saves 2 docs (3rd blocked with upgrade prompt), resumes
on another device; bulk migration opens PRs across selected repos and each PR
increments the Polar meter; AI generate → editable Studio blocks with token
usage visible in Polar; zero-balance → clean upgrade prompt, no silent
failures; `/migrate` no longer reachable as a free tool.

---

## Phase 3 — Brand registry + hosted assets (the product)

### Brands (config)

As previously planned, now team-owned and Pro-gated:

- `brands` table: `id, team_id, slug (unique, lowercase), config jsonb,
  updated_at`. Config = badge param subset (`theme, color, labelColor,
  valueColor, font, variant, radius, logo, logoColor, gradient, mode`).
- Reference: `?brand=acme` and pretty path `/b/acme/{provider}/....svg`
  (parse in `parseSegments`/route glue).
- Resolution in `handleBadgeGET()` before `resolve()`: precedence
  **explicit query params > brand > defaults**. Two-tier cache, ~60s TTL so
  updates propagate through Camo in minutes. Fail-open: unknown brand renders
  defaults, tracks `brand_miss` — never a broken image.
- Slugs: **global namespace** with squatting rules (reserved words list,
  first-come for now; trademark disputes handled manually). Global wins
  because the whole point is short embed URLs on third-party sites.

### Hosted brand assets (the rebrand wedge)

New: brands own **assets**, not just params.

- `brand_assets` table: `id, brand_id, kind ('logo' | 'logo-mark' |
  'wordmark'), svg/png bytea or blob-store URL, updated_at`.
- Stable serving URLs: `/b/acme/logo.svg`, `/b/acme/logo.png?size=…` —
  short cache TTL (~5 min) + ETag, so a logo swap propagates everywhere.
- Badge integration: `logo=brand` (or automatic when `?brand=` present and
  the brand has a logo) uses the hosted asset instead of a SimpleIcons slug.
- **Header integration**: README headers (`app/header`, `HeaderBuilder`,
  `header-builder-shared.ts`) accept `?brand=acme` — logo, colors, font all
  pulled from the brand. Rebrand → every README header banner updates.
- Satori constraint: hosted logos must be sanitized SVG or rasterized —
  reuse the existing remote-logo fetch/sanitize path from headers.

### CRUD + Studio

- `app/api/brands/[slug]` (GET/PUT/DELETE), team-ownership + `isPro` checks.
- Studio (`components/studio/`) gets "Save as brand" (it already produces the
  full param set) and a brand picker in the badge/header builders.

Acceptance: update brand config or logo → all badges *and headers*
referencing it change within ~2 min; params still override per-badge; engine
serves `/b/...` identically (read-only); free users can *consume* public
brand URLs but not create brands.

---

## Phase 4 — Dashboard

`app/dashboard/` (auth-gated via Stack Auth):

0. **My READMEs** (Plus+) — saved Studio documents list, open in Studio,
   AI credits remaining, migration history.
1. **Brands** (Pro) — list/create/edit brands, live preview (reuse builder
   components), asset upload, copy-paste embed snippets (md/html) for badges
   and headers.
2. **Analytics** — per-brand: total renders, per-subject table, source
   breakdown (GitHub/npm/docs/direct), 30/90-day trend. Reads
   `badge_stats_daily`. "At least N" labeling per the Camo caveat.
3. **Team** — Stack Auth team management embed (invites, members).
4. **Billing** — Polar customer portal link, plan status, cancel/resume.
5. Marketing: `/pro` pricing page; landing page + sponsor page cross-links;
   docs section `content/docs/pro/` (brands, assets, analytics, API).

---

## Sequencing

1. **Phase 0** — copy cleanup. One PR, ship now.
2. **Phase 1** — analytics enrichment + rollup table. Small PR, starts
   accumulating dashboard data before launch.
3. **Phase 2** — Neon Auth + Polar wiring behind a feature flag.
4. **Phase 2.5** — **Plus launch** (saved READMEs + mass migration + AI).
   First revenue; exercises auth/billing end-to-end with a small surface.
5. **Phase 3** — brands + assets (the bulk of the work; core + web + engine).
6. **Phase 4** — dashboard + `/pricing` page → **Pro launch**.

## Open questions

- Free hook: strictly 0 free brands, or 1 free brand (no analytics, no
  assets) to seed adoption? Leaning **1 free brand** — stickiness beats
  purity, and analytics/assets/teams are still clearly worth $30.
- Plus saved-README cap: 2 at launch — raise to 5/10 later, or make
  "unlimited" a Pro differentiator?
- AI credits: 50/mo flat, or tiered (Plus 50 / Pro 200)? Which model/provider
  (cost per generation determines the cap)?
- Free taste: 1 account-gated AI generation to convert free → Plus?
- Migrate funnel: keep anonymous **scan + preview** ("here's what your README
  would look like — sign up for Plus to open the PRs") or gate the whole
  page? Leaning keep scan/preview — it's the best Plus ad we have.
- Meter denominations: AI in raw tokens (what LLMStrategy ingests) vs a
  "generations" abstraction on top; migration flat per-PR seems right.
- Plus price: $8 vs $5 vs $10 — $8 leaves room for launch discounts and
  yearly ($80/yr).
- Asset storage: Postgres bytea (simple, engine-parity) vs Vercel Blob
  (cheaper egress). Start bytea + cache, revisit at volume.
- Yearly pricing ($300/yr?) at launch or later.
- Engine Pro (self-hosted license) stays parked until real inbound demand.
