# AGENTS.md — shieldcn

## What this is

shieldcn is a standalone Next.js app that serves styled SVG/PNG badge images for use in GitHub READMEs, npm pages, and docs sites. It's a shields.io alternative where badges are rendered as actual shadcn/ui Button components via Satori.

## Architecture

- **Badge renderer** (`lib/badges/render.tsx`) — React components → SVG via Satori. Uses Inter Medium font. Every badge goes through one `resolve()` function then one `renderSingle()` or `renderSplit()` function. No variant-specific render paths.
- **Button tokens** (`lib/badges/button-tokens.ts`) — Exact shadcn Button design tokens (bg, fg, border per variant) resolved to hex values for both dark and light mode.
- **Icon resolution** (`lib/badges/simple-icons.ts`) — Three sources: SimpleIcons (2400+), Lucide (1900+), React Icons (40,000+). Prefix convention: bare slug = SimpleIcons, `lucide:name` = Lucide, `ri:ComponentName` = React Icons.
- **Data providers** (`lib/providers/`) — npm, GitHub, Discord, Reddit, static badges, dynamic JSON, HTTPS endpoint, memo badges. Each returns `{ label, value, color?, link? }`.
- **Token pool** (`lib/token-pool.ts`) — GitHub OAuth token pool stored in Postgres. Distributes API requests across many user-donated tokens to stay under rate limits. Inspired by shields.io.
- **Route handler** (`app/[...slug]/route.ts`) — Single catch-all that parses URLs, fetches data, resolves icons/colors/variants, renders SVG/PNG/JSON.
- **Docs** (`content/docs/`) — Fumadocs MDX pages under `/docs`.
- **Landing page** (`app/page.tsx`) — Badge builder with full controls.
- **Showcase** (`app/showcase/page.tsx`) — Live badge examples + shields.io comparison.
- **Gallery** (`app/gallery/page.tsx`) — 130+ branded SimpleIcons badges by category.
- **Sponsor** (`app/sponsor/page.tsx`) — GitHub Sponsors page with tier plaques + stargazers.
- **Token pool page** (`app/token-pool/page.tsx`) — OAuth authorize flow for GitHub token donations.

## Key constraints

- SVGs are sandboxed when served as `<img>` — no external CSS, no CSS variables. All styling resolved to inline values by Satori.
- Satori does NOT support `dangerouslySetInnerHTML`, `opacity` CSS property (use rgba colors instead), or variable fonts.
- Text measurement is handled by Satori internally via the Inter Medium TTF font file.
- Error states always return a valid SVG badge, never a broken image.
- The `resolve()` function in render.tsx computes ALL colors before rendering. Variants only change bg/fg/border — nothing else.

## Stack

- Next.js 16, React 19, deployed on Vercel
- Fumadocs for docs (fumadocs-core, fumadocs-mdx, @fumadocs/base-ui aliased as fumadocs-ui)
- Tailwind CSS v4 (CSS-first @theme config, globals.css adopted from jalco-ui)
- Geist + Geist Mono fonts (site), Inter Medium TTF (badge rendering via Satori)
- Satori for JSX → SVG rendering
- @resvg/resvg-wasm for SVG → PNG conversion
- PostgreSQL for token pool + memo badges
- pnpm package manager

## Conventions

- No semicolons in TypeScript
- Double quotes for strings
- `@/*` import alias
- File headers with project name and module path
- shadcn/ui components installed via `pnpm dlx shadcn@latest add`
- jalco-ui components installed via `pnpm dlx shadcn@latest add "https://ui.justinlevine.me/r/{name}.json"`

## Badge URL format

```
/{provider}/{...params}.svg    → SVG badge
/{provider}/{...params}.png    → PNG badge
/{provider}/{...params}.json   → raw data
/{provider}/{...params}/shields.json → shields.io compat
```

## Query parameters

| Param | Values | Default |
|-------|--------|---------|
| `variant` | `default`, `secondary`, `outline`, `ghost`, `destructive` | `default` |
| `size` | `xs`, `sm`, `default`, `lg` | `sm` |
| `mode` | `dark`, `light` | `dark` |
| `theme` | `zinc`, `slate`, `blue`, `green`, `rose`, `orange`, `violet`, `purple`, `cyan`, `emerald` | — |
| `split` | `true`, `false` | `false` |
| `statusDot` | `true`, `false` | auto for CI |
| `logo` | SimpleIcons slug, `lucide:name`, `ri:Name`, `false` | auto |
| `logoColor` | hex without # | auto |
| `color` | hex without # | — |
| `labelColor` | hex without # | — |
| `valueColor` | hex without # | — |
| `labelTextColor` | hex without # | — |
| `label` | string | auto |
| `labelOpacity` | 0–1 | 0.7 |
| `height`, `fontSize`, `radius`, `padX`, `iconSize`, `gap`, `labelGap` | number (px) | per size preset |

## Rules

### When adding or updating a badge category:

1. **Update the provider** in `lib/providers/` with the new fetch functions
2. **Update the route handler** in `app/[...slug]/route.ts` to wire the new endpoints
3. **Update the default icon mapping** in `getDefaultLogoSlug()` in the route handler
4. **Update or create docs** in `content/docs/badges/` — use `<BadgeSandbox>` for interactive examples
5. **Update `content/docs/badges/meta.json`** to include new pages
6. **Update the sidebar** in `components/sidebar.tsx` to include new nav items
7. **Update the API reference** in `content/docs/api-reference.mdx` with new endpoints and params
8. **Update the showcase** in `app/showcase/page.tsx` with example badges
9. **Update the gallery** in `app/gallery/page.tsx` if new branded icons are relevant
10. **Update the README** badge type table
11. **Update the landing page** URL reference table in `app/page.tsx`

### When modifying the badge renderer:

- ALL variants MUST go through the same `resolve()` → `renderSingle()`/`renderSplit()` pipeline
- Never add variant-specific rendering logic inside the render functions
- Test all variants produce consistent font weight, spacing, and opacity
- Use `rgba()` for opacity instead of CSS `opacity` property (Satori bug)

### When adding shadcn components:

- Install via `pnpm dlx shadcn@latest add {component}`
- jalco-ui registry: `pnpm dlx shadcn@latest add "https://ui.justinlevine.me/r/{name}.json"`
