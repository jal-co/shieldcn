# Monorepo Migration Plan

> **Goal:** Split shieldcn into a Turborepo monorepo with three packages — `core` (shared badge engine), `web` (marketing site), and `engine` (self-hostable Docker image) — without breaking anything.

## Table of Contents

- [Architecture](#architecture)
- [File Map](#file-map)
- [Dependency Graph](#dependency-graph)
- [Phase 0: Scaffold the Workspace](#phase-0-scaffold-the-workspace) — #44
- [Phase 1: Create `packages/core`](#phase-1-create-packagescore) — #45
- [Phase 2: Create `packages/web`](#phase-2-create-packagesweb) — #46
- [Phase 3: Update Imports in `packages/web`](#phase-3-update-imports-in-packagesweb) — #47
- [Phase 4: Extract Route Handler into Core](#phase-4-extract-route-handler-into-core) — #48
- [Phase 5: Create `packages/engine`](#phase-5-create-packagesengine) — #49
- [Phase 6: Dockerfile + Docker Compose](#phase-6-dockerfile--docker-compose) — #50
- [Phase 7: Resvg WASM Bundling](#phase-7-resvg-wasm-bundling) — #51
- [Phase 8: CI — Docker Image Publishing](#phase-8-ci--docker-image-publishing) — #52
- [Phase 9: Vercel Configuration](#phase-9-vercel-configuration) — #53
- [Phase 10: Update Documentation + AGENTS.md](#phase-10-update-documentation--agentsmd) — #54
- [Verification Checklist](#verification-checklist)
- [Risks + Mitigations](#risks--mitigations)

---

## Architecture

```
shieldcn/
├── packages/
│   ├── core/                     ← @shieldcn/core (shared badge engine library)
│   │   ├── src/
│   │   │   ├── badges/           (render, tokens, themes, icons, types…)
│   │   │   ├── providers/        (30 provider modules)
│   │   │   ├── fonts/            (Inter, Geist, Geist Mono TTFs)
│   │   │   ├── cache.ts
│   │   │   ├── db.ts
│   │   │   ├── token-pool.ts
│   │   │   ├── gen-counter.ts
│   │   │   ├── format.ts         (formatCount — single source of truth)
│   │   │   ├── provider-fetch.ts
│   │   │   ├── normalize-params.ts
│   │   │   └── route-handler.ts  (extracted fetchBadgeData + GET/PUT logic)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                      ← @shieldcn/web (marketing site, Vercel)
│   │   ├── app/                  (all routes: badge API, docs, gallery, etc.)
│   │   ├── components/           (shadcn/ui + custom components)
│   │   ├── content/              (Fumadocs MDX pages)
│   │   ├── lib/                  (site-only: utils, openpanel, metadata…)
│   │   ├── public/               (og.png, llms.txt)
│   │   ├── registry/             (shadcn registry source files)
│   │   ├── brand/                (brand assets)
│   │   ├── scripts/              (build-icon-index.ts)
│   │   ├── components.json       (shadcn config)
│   │   ├── registry.json         (shadcn registry manifest)
│   │   ├── source.config.ts      (Fumadocs config)
│   │   ├── mdx-components.tsx
│   │   ├── next.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── eslint.config.mjs
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── engine/                   ← @shieldcn/engine (self-hosted Docker)
│       ├── app/
│       │   ├── [...slug]/route.ts
│       │   ├── api/auth/github/
│       │   ├── api/health/route.ts
│       │   ├── api/gen-count/route.ts
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── Dockerfile
│       ├── docker-compose.yml
│       ├── .env.example
│       ├── next.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── .github/
├── .husky/
├── .gitignore
├── .gitattributes
├── commit-check.toml
├── AGENTS.md
├── README.md
└── LICENSE
```

---

## File Map

### Files moving to `packages/core/src/`

| Current Location | New Location | Notes |
|---|---|---|
| `lib/badges/brand-colors.ts` | `packages/core/src/badges/brand-colors.ts` | |
| `lib/badges/button-tokens.ts` | `packages/core/src/badges/button-tokens.ts` | |
| `lib/badges/custom-icons.ts` | `packages/core/src/badges/custom-icons.ts` | |
| `lib/badges/icon-index.ts` | `packages/core/src/badges/icon-index.ts` | |
| `lib/badges/icon-list.json` | `packages/core/src/badges/icon-list.json` | |
| `lib/badges/icons.ts` | `packages/core/src/badges/icons.ts` | |
| `lib/badges/measure.ts` | `packages/core/src/badges/measure.ts` | |
| `lib/badges/render.tsx` | `packages/core/src/badges/render.tsx` | ⚠️ Fix `process.cwd()` font path |
| `lib/badges/simple-icons.ts` | `packages/core/src/badges/simple-icons.ts` | |
| `lib/badges/svg-parser.ts` | `packages/core/src/badges/svg-parser.ts` | |
| `lib/badges/themes.ts` | `packages/core/src/badges/themes.ts` | |
| `lib/badges/types.ts` | `packages/core/src/badges/types.ts` | |
| `lib/providers/*.ts` (all 30) | `packages/core/src/providers/*.ts` | ⚠️ `formatCount` import changes |
| `lib/fonts/*.ttf` (3 files) | `packages/core/src/fonts/*.ttf` | |
| `lib/cache.ts` | `packages/core/src/cache.ts` | |
| `lib/db.ts` | `packages/core/src/db.ts` | ⚠️ Fix SSL logic for Docker |
| `lib/gen-counter.ts` | `packages/core/src/gen-counter.ts` | |
| `lib/token-pool.ts` | `packages/core/src/token-pool.ts` | |
| `lib/provider-fetch.ts` | `packages/core/src/provider-fetch.ts` | |
| `lib/normalize-params.ts` | `packages/core/src/normalize-params.ts` | |
| `lib/github.ts` | `packages/core/src/github.ts` | `formatCount` deduped into `format.ts` |
| *(new)* | `packages/core/src/format.ts` | `formatCount` — single source of truth |
| *(new)* | `packages/core/src/route-handler.ts` | Extracted from `app/[...slug]/route.ts` |

### Files moving to `packages/web/`

| Current Location | New Location | Notes |
|---|---|---|
| `app/` (entire directory) | `packages/web/app/` | |
| `components/` (entire directory) | `packages/web/components/` | |
| `content/` (entire directory) | `packages/web/content/` | |
| `public/` (entire directory) | `packages/web/public/` | |
| `registry/` (entire directory) | `packages/web/registry/` | |
| `brand/` (entire directory) | `packages/web/brand/` | |
| `scripts/` (entire directory) | `packages/web/scripts/` | |
| `lib/utils.ts` | `packages/web/lib/utils.ts` | ⚠️ Remove `formatCount` (use core) |
| `lib/use-badge-mode.ts` | `packages/web/lib/use-badge-mode.ts` | |
| `lib/badge-builder-shared.ts` | `packages/web/lib/badge-builder-shared.ts` | |
| `lib/showcase-data.ts` | `packages/web/lib/showcase-data.ts` | |
| `lib/tour-constants.ts` | `packages/web/lib/tour-constants.ts` | |
| `lib/highlight-code.ts` | `packages/web/lib/highlight-code.ts` | |
| `lib/metadata.ts` | `packages/web/lib/metadata.ts` | |
| `lib/json-ld.ts` | `packages/web/lib/json-ld.ts` | |
| `lib/openpanel.ts` | `packages/web/lib/openpanel.ts` | |
| `lib/source.ts` | `packages/web/lib/source.ts` | |
| `lib/registry.ts` | `packages/web/lib/registry.ts` | |
| `lib/gen/` (entire directory) | `packages/web/lib/gen/` | |
| `components.json` | `packages/web/components.json` | ⚠️ Verify aliases still work |
| `registry.json` | `packages/web/registry.json` | File paths unchanged (relative) |
| `source.config.ts` | `packages/web/source.config.ts` | |
| `mdx-components.tsx` | `packages/web/mdx-components.tsx` | |
| `next.config.ts` | `packages/web/next.config.ts` | ⚠️ Add `transpilePackages` |
| `postcss.config.mjs` | `packages/web/postcss.config.mjs` | |
| `eslint.config.mjs` | `packages/web/eslint.config.mjs` | |
| `tsconfig.json` | `packages/web/tsconfig.json` | ⚠️ `@/*` = `./*`, `.source` path |
| `app/globals.css` | `packages/web/app/globals.css` | |

### Files staying at repo root

| File | Purpose |
|---|---|
| `pnpm-workspace.yaml` | Workspace definition |
| `pnpm-lock.yaml` | Shared lockfile |
| `turbo.json` | *(new)* Turborepo task config |
| `package.json` | *(rewritten)* Workspace root — scripts only, no Next.js deps |
| `.gitignore` | Updated for all packages |
| `.gitattributes` | Unchanged |
| `.github/` | CI workflows — ⚠️ update path references |
| `.husky/` | Git hooks — ⚠️ update `lint-staged` reference |
| `commit-check.toml` | Unchanged |
| `AGENTS.md` | ⚠️ Major rewrite needed |
| `README.md` | ⚠️ Add self-hosting section |
| `LICENSE` | Unchanged |

### Files deleted

| File | Reason |
|---|---|
| `logo-dev-email.txt` | Already gitignored, not tracked |
| `sponsorship-application.txt` | Already gitignored, not tracked |
| Root `next-env.d.ts` | Generated by Next.js — will be in `packages/web/` |
| Root `tsconfig.tsbuildinfo` | Generated — will be in `packages/web/` |

---

## Dependency Graph

### `@shieldcn/core` internal dependency chain

```
cache.ts ← (standalone, uses @upstash/redis, lru-cache)
db.ts ← (standalone, uses pg)
token-pool.ts ← db.ts
gen-counter.ts ← db.ts
provider-fetch.ts ← cache.ts
format.ts ← (standalone, no imports)
providers/*.ts ← provider-fetch.ts, cache.ts, format.ts, badges/types.ts
                  memo.ts ← db.ts
                  github.ts ← token-pool.ts
badges/render.tsx ← badges/*, fonts/*, satori
route-handler.ts ← badges/*, providers/*, normalize-params.ts
```

### `@shieldcn/core` → external deps

```
pg, @upstash/redis, lru-cache, satori, @resvg/resvg-wasm,
simple-icons, react-icons, svgo, jsonpath-plus, react
```

### `@shieldcn/web` → `@shieldcn/core`

```
app/[...slug]/route.ts      → core/route-handler
app/page.tsx                 → core/gen-counter
app/token-pool/page.tsx      → core/token-pool
app/api/gen-count/route.ts   → core/gen-counter
app/api/gen-inspect/route.ts → core/token-pool
app/api/auth/github/callback → core/token-pool
components/logo-picker.tsx   → core/badges/icon-index, icon-list.json
```

### `@shieldcn/engine` → `@shieldcn/core`

```
app/[...slug]/route.ts      → core/route-handler
app/api/auth/github/callback → core/token-pool
app/api/gen-count/route.ts   → core/gen-counter
app/api/health/route.ts      → core/token-pool (pool stats)
```

---

## Phase 0: Scaffold the Workspace

### TODO 0.1 — Create root workspace `package.json`

Rewrite the root `package.json` to be a workspace root only — no Next.js dependencies:

```json
{
  "name": "shieldcn",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "dev:web": "turbo dev --filter=@shieldcn/web",
    "dev:engine": "turbo dev --filter=@shieldcn/engine",
    "build:web": "turbo build --filter=@shieldcn/web",
    "build:engine": "turbo build --filter=@shieldcn/engine",
    "prepare": "husky"
  },
  "devDependencies": {
    "turbo": "^2",
    "husky": "^9.1.7",
    "lint-staged": "^16.4.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": "eslint --no-warn-ignored --max-warnings 0"
  },
  "packageManager": "pnpm@10.6.2"
}
```

### TODO 0.2 — Update `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
```

### TODO 0.3 — Create `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    }
  }
}
```

### TODO 0.4 — Update `.gitignore`

Add:

```
# turborepo
.turbo
```

### TODO 0.5 — Update `.husky/pre-commit`

The `lint-staged` config stays in the root `package.json`, but ESLint needs to find the correct config. Update to:

```sh
#!/bin/sh
pnpm lint-staged
```

*(This may need adjusting — lint-staged will run eslint which needs the config. Might need `--cwd` or the web eslint config at root level. Test in Phase 2.)*

### ✅ Verification: `pnpm install` succeeds from root

---

## Phase 1: Create `packages/core`

### TODO 1.1 — Create `packages/core/package.json`

```json
{
  "name": "@shieldcn/core",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    "./badges/*": "./src/badges/*",
    "./providers/*": "./src/providers/*",
    "./fonts/*": "./src/fonts/*",
    "./cache": "./src/cache.ts",
    "./db": "./src/db.ts",
    "./token-pool": "./src/token-pool.ts",
    "./gen-counter": "./src/gen-counter.ts",
    "./provider-fetch": "./src/provider-fetch.ts",
    "./normalize-params": "./src/normalize-params.ts",
    "./format": "./src/format.ts",
    "./github": "./src/github.ts",
    "./route-handler": "./src/route-handler.ts"
  },
  "dependencies": {
    "@resvg/resvg-wasm": "^2.6.2",
    "@upstash/redis": "^1.37.0",
    "jsonpath-plus": "^10.4.0",
    "lru-cache": "^11.3.5",
    "pg": "^8.20.0",
    "react-icons": "^5.6.0",
    "satori": "^0.26.0",
    "simple-icons": "^16.17.0",
    "svgo": "^4.0.1"
  },
  "devDependencies": {
    "@types/pg": "^8.20.0",
    "@types/react": "^19",
    "typescript": "^5"
  },
  "peerDependencies": {
    "react": "^19"
  }
}
```

### TODO 1.2 — Create `packages/core/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "paths": {
      "@shieldcn/core/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### TODO 1.3 — Create `packages/core/src/format.ts`

Extract `formatCount` from `lib/utils.ts` into its own file — this is the single source of truth:

```ts
/**
 * @shieldcn/core
 * src/format.ts
 *
 * Number formatting utilities used by providers.
 */

/**
 * Format a number for compact display.
 * - 236000 → "236k"
 * - 1500000 → "1.5m"
 * - 842 → "842"
 */
export function formatCount(count: number): string {
  if (count >= 1_000_000) {
    const value = count / 1_000_000
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}m`
  }
  if (count >= 1_000) {
    const value = count / 1_000
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}k`
  }
  return count.toLocaleString("en-US")
}
```

### TODO 1.4 — Move badge engine files

Move files from `lib/` → `packages/core/src/`:

```bash
# Create directory structure
mkdir -p packages/core/src/badges
mkdir -p packages/core/src/providers
mkdir -p packages/core/src/fonts

# Move badges
mv lib/badges/brand-colors.ts packages/core/src/badges/
mv lib/badges/button-tokens.ts packages/core/src/badges/
mv lib/badges/custom-icons.ts packages/core/src/badges/
mv lib/badges/icon-index.ts packages/core/src/badges/
mv lib/badges/icon-list.json packages/core/src/badges/
mv lib/badges/icons.ts packages/core/src/badges/
mv lib/badges/measure.ts packages/core/src/badges/
mv lib/badges/render.tsx packages/core/src/badges/
mv lib/badges/simple-icons.ts packages/core/src/badges/
mv lib/badges/svg-parser.ts packages/core/src/badges/
mv lib/badges/themes.ts packages/core/src/badges/
mv lib/badges/types.ts packages/core/src/badges/

# Move providers
mv lib/providers/*.ts packages/core/src/providers/

# Move fonts
mv lib/fonts/*.ttf packages/core/src/fonts/

# Move infra
mv lib/cache.ts packages/core/src/
mv lib/db.ts packages/core/src/
mv lib/token-pool.ts packages/core/src/
mv lib/gen-counter.ts packages/core/src/
mv lib/provider-fetch.ts packages/core/src/
mv lib/normalize-params.ts packages/core/src/
mv lib/github.ts packages/core/src/
```

### TODO 1.5 — Fix internal imports in `packages/core/src/`

All `@/lib/...` imports within core files need to become relative imports.

**Providers (21 files)** — change `@/lib/utils` → relative `@shieldcn/core/format`:

```
@/lib/utils → import { formatCount } from "@shieldcn/core/format"
@/lib/provider-fetch → import { providerFetch } from "@shieldcn/core/provider-fetch"
@/lib/cache → import { ... } from "@shieldcn/core/cache"
@/lib/badges/types → import type { BadgeData } from "@shieldcn/core/badges/types"
@/lib/db → import { getPool, initDB } from "@shieldcn/core/db"
@/lib/token-pool → import { pickToken, invalidateToken } from "@shieldcn/core/token-pool"
```

Or use relative paths like `../format`, `../provider-fetch`, etc. since they're inside the same package.

**Decision:** Use relative imports inside core (`../format`, `./types`, etc.) since these are all inside the same package. Reserve `@shieldcn/core/*` for consumers.

Specific files and their import changes:

| File | Old Import | New Import |
|---|---|---|
| `providers/*.ts` (21 files) | `from "@/lib/utils"` | `from "../format"` |
| `providers/*.ts` (24 files) | `from "@/lib/provider-fetch"` | `from "../provider-fetch"` |
| `providers/*.ts` (2 files) | `from "@/lib/cache"` | `from "../cache"` |
| `providers/memo.ts` | `from "@/lib/badges/types"` | `from "../badges/types"` |
| `providers/memo.ts` | `from "@/lib/db"` | `from "../db"` |
| `providers/github.ts` | `from "@/lib/token-pool"` | `from "../token-pool"` |
| `gen-counter.ts` | `from "@/lib/db"` | `from "./db"` |
| `token-pool.ts` | `from "./db"` | `from "./db"` (no change) |

### TODO 1.6 — Fix `render.tsx` font path

Current: `const fontsDir = join(process.cwd(), "lib/fonts")`

This breaks because fonts are now at `packages/core/src/fonts/`. Fix using `import.meta.url` or `__dirname` equivalent:

```ts
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const fontsDir = join(__dirname, "fonts")
```

**Fallback:** If `import.meta.url` doesn't work in all Next.js contexts, use `path.resolve(__dirname, "fonts")` with the CJS `__dirname`. Test both.

### TODO 1.7 — Fix `db.ts` SSL for Docker

Add Docker-friendly SSL detection:

```ts
ssl: connString && !connString.includes("localhost") && !connString.includes(":5432/")
  && (connString.includes("neon") || connString.includes("railway")
      || connString.includes("supabase") || connString.includes("sslmode=require"))
  ? { rejectUnauthorized: false }
  : undefined,
```

Or simpler — just check for `?sslmode=require` or `?ssl=true` in the connection string explicitly, and default to no SSL.

### ✅ Verification

- `packages/core/` has no `@/lib/` imports remaining
- TypeScript compilation: `cd packages/core && npx tsc --noEmit`

---

## Phase 2: Create `packages/web`

### TODO 2.1 — Create `packages/web/package.json`

Move all dependencies from root `package.json` to `packages/web/package.json`, minus the ones that moved to core:

```json
{
  "name": "@shieldcn/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "build:icons": "tsx scripts/build-icon-index.ts"
  },
  "dependencies": {
    "@shieldcn/core": "workspace:*",
    "@davestewart/outliner": "^1.2.0",
    "@openpanel/nextjs": "^1.5.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "fumadocs-core": "^16.8.2",
    "fumadocs-mdx": "^14.3.1",
    "fumadocs-ui": "npm:@fumadocs/base-ui@^16.8.2",
    "jose": "^6.2.3",
    "lucide-react": "^1.8.0",
    "motion": "^12.38.0",
    "next": "16.2.4",
    "next-themes": "^0.4.6",
    "nuqs": "^2.8.9",
    "radix-ui": "^1.4.3",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "shiki": "^4.0.2",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0",
    "yaml": "^2.8.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@tailwindcss/typography": "^0.5.19",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "tailwindcss": "^4",
    "tsx": "^4.21.0",
    "typescript": "^5"
  }
}
```

Note: `pg`, `@upstash/redis`, `lru-cache`, `satori`, `@resvg/resvg-wasm`, `simple-icons`, `react-icons`, `svgo`, `jsonpath-plus` moved to `@shieldcn/core`.

### TODO 2.2 — Move directories into `packages/web/`

```bash
mkdir -p packages/web

mv app/ packages/web/app/
mv components/ packages/web/components/
mv content/ packages/web/content/
mv public/ packages/web/public/
mv registry/ packages/web/registry/
mv brand/ packages/web/brand/
mv scripts/ packages/web/scripts/

# Site-only lib files
mkdir -p packages/web/lib/gen
mv lib/utils.ts packages/web/lib/
mv lib/use-badge-mode.ts packages/web/lib/
mv lib/badge-builder-shared.ts packages/web/lib/
mv lib/showcase-data.ts packages/web/lib/
mv lib/tour-constants.ts packages/web/lib/
mv lib/highlight-code.ts packages/web/lib/
mv lib/metadata.ts packages/web/lib/
mv lib/json-ld.ts packages/web/lib/
mv lib/openpanel.ts packages/web/lib/
mv lib/source.ts packages/web/lib/
mv lib/registry.ts packages/web/lib/
mv lib/gen/*.ts packages/web/lib/gen/

# Config files
mv components.json packages/web/
mv registry.json packages/web/
mv source.config.ts packages/web/
mv mdx-components.tsx packages/web/
mv next.config.ts packages/web/
mv postcss.config.mjs packages/web/
mv eslint.config.mjs packages/web/
mv tsconfig.json packages/web/
```

### TODO 2.3 — Create `packages/web/tsconfig.json`

Same as current, but ensure `@/*` resolves within `packages/web/`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "fumadocs-mdx:collections/*": ["./.source/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

### TODO 2.4 — Update `packages/web/next.config.ts`

Add `transpilePackages` for `@shieldcn/core`:

```ts
import type { NextConfig } from "next"
import { createMDX } from "fumadocs-mdx/next"

const nextConfig: NextConfig = {
  transpilePackages: ["@shieldcn/core"],
}

const withMDX = createMDX()

export default withMDX(nextConfig)
```

### TODO 2.5 — Update `packages/web/lib/utils.ts`

Remove `formatCount` (moved to core). Re-export it for backward compat if any component imports it from here:

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export formatCount from core for backward compatibility
export { formatCount } from "@shieldcn/core/format"
```

### TODO 2.6 — Update `packages/web/components.json`

The `aliases` section uses `@/` paths which now resolve to `packages/web/`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": {
    "@fonttrio": "https://www.fonttrio.xyz/r/{name}.json"
  }
}
```

**No changes needed** — `@/` resolves to `packages/web/` via tsconfig `paths`, so `@/lib/utils` → `packages/web/lib/utils.ts`. ✅

### TODO 2.7 — Update `packages/web/source.config.ts`

`dir: "content/docs"` is relative to where `source.config.ts` lives, which is now `packages/web/`. Since `content/` also moved to `packages/web/content/`, no change needed. ✅

### TODO 2.8 — Verify `packages/web/lib/registry.ts`

The `process.cwd()` call in `buildRegistryItemResponse()`:

```ts
const filePath = join(process.cwd(), file.path)
```

When Next.js runs from `packages/web/`, `process.cwd()` = `packages/web/`. The `registry.json` file paths are `"registry/readme-badge/readme-badge.tsx"` — relative to `packages/web/`. Since `registry/` moved to `packages/web/registry/`, this resolves correctly. ✅

### TODO 2.9 — Clean up root

After moving everything:

```bash
# Remove now-empty directories
rm -rf lib/
rm -rf lib/badges/
rm -rf lib/providers/
rm -rf lib/fonts/
rm -rf lib/gen/

# Remove stale root config (now in packages/web/)
rm -f next-env.d.ts
rm -f tsconfig.tsbuildinfo

# These files were already gitignored but may be tracked
git rm --cached logo-dev-email.txt sponsorship-application.txt 2>/dev/null || true
```

### ✅ Verification

- `pnpm install` succeeds
- `pnpm --filter @shieldcn/web dev` starts (will fail on imports — that's Phase 3)

---

## Phase 3: Update Imports in `packages/web`

### TODO 3.1 — Update `app/[...slug]/route.ts` imports

Change all `@/lib/badges/*`, `@/lib/providers/*`, etc. to `@shieldcn/core/*`:

| Old | New |
|---|---|
| `@/lib/badges/render` | `@shieldcn/core/badges/render` |
| `@/lib/badges/themes` | `@shieldcn/core/badges/themes` |
| `@/lib/badges/simple-icons` | `@shieldcn/core/badges/simple-icons` |
| `@/lib/badges/brand-colors` | `@shieldcn/core/badges/brand-colors` |
| `@/lib/badges/svg-parser` | `@shieldcn/core/badges/svg-parser` |
| `@/lib/badges/types` | `@shieldcn/core/badges/types` |
| `@/lib/normalize-params` | `@shieldcn/core/normalize-params` |
| `@/lib/providers/npm` | `@shieldcn/core/providers/npm` |
| `@/lib/providers/github` | `@shieldcn/core/providers/github` |
| *(all 28 provider imports)* | `@shieldcn/core/providers/*` |

### TODO 3.2 — Update `app/page.tsx`

```ts
import { getGenCount } from "@shieldcn/core/gen-counter"
```

### TODO 3.3 — Update `app/token-pool/page.tsx`

```ts
import { getPoolStats } from "@shieldcn/core/token-pool"
```

### TODO 3.4 — Update `app/api/gen-count/route.ts`

```ts
import { incrementGenCounter, getGenCount } from "@shieldcn/core/gen-counter"
```

### TODO 3.5 — Update `app/api/gen-inspect/route.ts`

```ts
import { pickToken, invalidateToken } from "@shieldcn/core/token-pool"
```

### TODO 3.6 — Update `app/api/auth/github/callback/route.ts`

```ts
import { addToken } from "@shieldcn/core/token-pool"
```

### TODO 3.7 — Update `components/logo-picker.tsx`

```ts
import { ... } from "@shieldcn/core/badges/icon-index"
// and the dynamic import:
iconIndexPromise = import("@shieldcn/core/badges/icon-list.json").then(...)
```

### TODO 3.8 — Verify no remaining `@/lib/badges`, `@/lib/providers`, or `@/lib/cache` imports

```bash
cd packages/web
grep -r "@/lib/\(badges\|providers\|cache\|db\|token-pool\|gen-counter\|provider-fetch\|normalize-params\)" . --include="*.ts" --include="*.tsx"
# Should return 0 results
```

### TODO 3.9 — Verify all `@/lib/*` imports point to files that exist in `packages/web/lib/`

```bash
cd packages/web
grep -roh "@/lib/[a-zA-Z/\-]*" . --include="*.ts" --include="*.tsx" | sort -u
# Each of these must have a corresponding file in packages/web/lib/
```

### ✅ Verification

- `pnpm --filter @shieldcn/web build` succeeds
- `pnpm --filter @shieldcn/web dev` starts
- `curl localhost:3000/npm/v/react.svg` returns valid SVG
- `curl localhost:3000/r/readme-badge.json` returns registry JSON with inlined source
- `cd packages/web && pnpm dlx shadcn@latest add tooltip` installs correctly
- Docs pages render at `localhost:3000/docs`

---

## Phase 4: Extract Route Handler into Core

### TODO 4.1 — Create `packages/core/src/route-handler.ts`

Extract from `packages/web/app/[...slug]/route.ts`:

- `fetchBadgeData()` function
- `getDefaultLogoSlug()` function
- `parseFormat()` function
- `parseGradient()` function
- `isLightHex()` + `brandedFg()` helpers
- `CACHE_HEADERS` constant
- The full `GET` handler logic (icon resolution, color resolution, SVG rendering)
- The `PUT` handler for memo badges

Expose as:

```ts
export interface BadgeRequestOptions {
  /** Optional analytics callback. Called after badge render. */
  onTrack?: (event: { name: string; data: Record<string, string | number | boolean> }) => void
}

export async function handleBadgeGET(
  request: Request,
  slug: string[],
  options?: BadgeRequestOptions
): Promise<Response>

export async function handleBadgePUT(
  request: Request,
  slug: string[]
): Promise<Response>
```

### TODO 4.2 — Simplify `packages/web/app/[...slug]/route.ts`

Replace the 1200-line file with:

```ts
import { handleBadgeGET, handleBadgePUT } from "@shieldcn/core/route-handler"
import { trackEvent } from "@/lib/openpanel"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgeGET(request, slug, { onTrack: trackEvent })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgePUT(request, slug)
}
```

### ✅ Verification

- `pnpm --filter @shieldcn/web build` succeeds
- All badge endpoints return identical SVGs as before
- Test branded, outline, ghost, split, gradient, status dot variants
- Test PNG output
- Test JSON output
- Test shields.json output
- Test memo PUT/GET
- Test error badge (invalid URL)

---

## Phase 5: Create `packages/engine`

### TODO 5.1 — Create `packages/engine/package.json`

```json
{
  "name": "@shieldcn/engine",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@shieldcn/core": "workspace:*",
    "next": "16.2.4",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5"
  }
}
```

### TODO 5.2 — Create `packages/engine/next.config.ts`

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@shieldcn/core"],
}

export default nextConfig
```

### TODO 5.3 — Create `packages/engine/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### TODO 5.4 — Create `packages/engine/app/layout.tsx`

Minimal layout — no fonts, no analytics, no UI framework:

```tsx
export const metadata = {
  title: "shieldcn engine",
  description: "Self-hosted badge rendering engine",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### TODO 5.5 — Create `packages/engine/app/page.tsx`

Simple JSON-like info page:

```tsx
export default function Home() {
  return (
    <main style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h1>shieldcn engine</h1>
      <p>Badge rendering engine is running.</p>
      <p>Try: <a href="/npm/v/react.svg">/npm/v/react.svg</a></p>
      <p>Health: <a href="/api/health">/api/health</a></p>
    </main>
  )
}
```

### TODO 5.6 — Create `packages/engine/app/[...slug]/route.ts`

```ts
import { handleBadgeGET, handleBadgePUT } from "@shieldcn/core/route-handler"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgeGET(request, slug)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgePUT(request, slug)
}
```

### TODO 5.7 — Create `packages/engine/app/api/health/route.ts`

```ts
import { getPoolStats } from "@shieldcn/core/token-pool"

export async function GET() {
  const pool = await getPoolStats()
  return Response.json({
    ok: true,
    engine: "shieldcn",
    pool,
  })
}
```

### TODO 5.8 — Create `packages/engine/app/api/gen-count/route.ts`

Copy from web, update imports to `@shieldcn/core/gen-counter`.

### TODO 5.9 — Create `packages/engine/app/api/auth/github/` routes

Copy OAuth routes from web, update imports:
- `route.ts` — no changes needed (no core imports)
- `callback/route.ts` — change `@/lib/token-pool` → `@shieldcn/core/token-pool`, remove `trackEvent`

### TODO 5.10 — Create `packages/engine/.env.example`

```env
# ─── Required ───────────────────────────────────────────────────
DATABASE_URL=postgresql://shieldcn:shieldcn@postgres:5432/shieldcn

# ─── Optional: GitHub Token Pool (OAuth) ────────────────────────
# Create a GitHub OAuth App: https://github.com/settings/developers
# Set callback URL to: ${NEXT_PUBLIC_URL}/api/auth/github/callback
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=

# ─── Optional: Single GitHub Token Fallback ─────────────────────
# Used when the token pool is empty. Create at https://github.com/settings/tokens
GITHUB_TOKEN=

# ─── Optional: Redis Cache (Upstash) ───────────────────────────
# Without this, cache is memory-only (fine for single instance)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ─── Optional: Provider API Keys ───────────────────────────────
YOUTUBE_API_KEY=

# ─── Engine URL (for OAuth redirects) ──────────────────────────
NEXT_PUBLIC_URL=http://localhost:3000
```

### ✅ Verification

- `pnpm --filter @shieldcn/engine dev` starts on port 3001
- `curl localhost:3001/npm/v/react.svg` returns valid SVG
- `curl localhost:3001/api/health` returns JSON
- `pnpm --filter @shieldcn/engine build` succeeds

---

## Phase 6: Dockerfile + Docker Compose

### TODO 6.1 — Create `packages/engine/Dockerfile`

Multi-stage build using Next.js standalone output:

```dockerfile
# ── Base ──────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable pnpm

# ── Dependencies ──────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/engine/package.json ./packages/engine/
RUN pnpm install --frozen-lockfile --prod=false

# ── Builder ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/ ./
COPY packages/core/ ./packages/core/
COPY packages/engine/ ./packages/engine/
COPY turbo.json ./
RUN pnpm --filter @shieldcn/engine build

# ── Runner ────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/packages/engine/.next/standalone ./
COPY --from=builder /app/packages/engine/.next/static ./packages/engine/.next/static
COPY --from=builder /app/packages/engine/public ./packages/engine/public 2>/dev/null || true

# Copy font files (needed at runtime by core/badges/render.tsx)
COPY --from=builder /app/packages/core/src/fonts ./packages/core/src/fonts

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "packages/engine/server.js"]
```

**⚠️ Note:** The font path in `render.tsx` (fixed in TODO 1.6) must resolve correctly inside the container. Test this.

### TODO 6.2 — Create `packages/engine/docker-compose.yml`

```yaml
version: "3.8"

services:
  engine:
    build:
      context: ../..
      dockerfile: packages/engine/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://shieldcn:shieldcn@postgres:5432/shieldcn
      - GITHUB_TOKEN=${GITHUB_TOKEN:-}
      - GITHUB_OAUTH_CLIENT_ID=${GITHUB_OAUTH_CLIENT_ID:-}
      - GITHUB_OAUTH_CLIENT_SECRET=${GITHUB_OAUTH_CLIENT_SECRET:-}
      - YOUTUBE_API_KEY=${YOUTUBE_API_KEY:-}
      - UPSTASH_REDIS_REST_URL=${UPSTASH_REDIS_REST_URL:-}
      - UPSTASH_REDIS_REST_TOKEN=${UPSTASH_REDIS_REST_TOKEN:-}
      - NEXT_PUBLIC_URL=${NEXT_PUBLIC_URL:-http://localhost:3000}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: shieldcn
      POSTGRES_PASSWORD: shieldcn
      POSTGRES_DB: shieldcn
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U shieldcn"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
```

### ✅ Verification

```bash
cd packages/engine
docker compose up --build
# In another terminal:
curl http://localhost:3000/api/health
curl http://localhost:3000/npm/v/react.svg
curl http://localhost:3000/github/stars/facebook/react.svg
curl http://localhost:3000/badge/hello-world-blue.svg
```

---

## Phase 7: Resvg WASM Bundling

### TODO 7.1 — Bundle WASM file locally

Current code fetches WASM from unpkg CDN:

```ts
await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm"))
```

For Docker (no internet access on some setups), bundle the WASM file:

1. Copy `node_modules/@resvg/resvg-wasm/index_bg.wasm` into `packages/core/src/wasm/`
2. Update `route-handler.ts` to load from file in production, CDN in dev:

```ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

try {
  if (process.env.NODE_ENV === "production") {
    const wasmPath = join(__dirname, "../wasm/index_bg.wasm")
    await initWasm(readFileSync(wasmPath))
  } else {
    await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm"))
  }
} catch { /* already initialized */ }
```

3. Ensure Dockerfile copies the WASM file.

**Alternative:** Use `@resvg/resvg-wasm/index_bg.wasm` directly from node_modules — check if standalone output includes it.

### ✅ Verification

- PNG generation works in Docker: `curl http://localhost:3000/npm/v/react.png -o test.png`

---

## Phase 8: CI — Docker Image Publishing

### TODO 8.1 — Create `.github/workflows/docker-publish.yml`

```yaml
name: Publish Docker Image

on:
  push:
    tags: ["v*"]
  workflow_dispatch:

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v6
        with:
          context: .
          file: packages/engine/Dockerfile
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/engine:latest
            ghcr.io/${{ github.repository }}/engine:${{ github.ref_name }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### TODO 8.2 — Update `.github/labeler.yml`

Add labels for the new package paths:

```yaml
docs:
  - changed-files:
      - any-glob-to-any-file:
          - "packages/web/content/docs/**"
          - "packages/web/app/docs/**"

engine:
  - changed-files:
      - any-glob-to-any-file:
          - "packages/engine/**"

core:
  - changed-files:
      - any-glob-to-any-file:
          - "packages/core/**"
```

---

## Phase 9: Vercel Configuration

### TODO 9.1 — Set Vercel root directory

In Vercel dashboard → Project Settings → General → Root Directory:

Set to: `packages/web`

### TODO 9.2 — Set Vercel install command

Vercel needs to install workspace dependencies. Set install command to:

```
pnpm install
```

(Run from repo root so all workspace deps resolve.)

### TODO 9.3 — Set Vercel build command

```
cd ../.. && pnpm turbo build --filter=@shieldcn/web
```

Or let Vercel auto-detect `pnpm build` inside `packages/web/` and rely on `turbo.json` to build `core` first. Test both approaches.

**Simpler alternative:** Set the build command in `packages/web/package.json`:

```json
"build": "turbo build --filter=@shieldcn/web"
```

And keep Vercel's root directory as repo root, not `packages/web/`. Some Turborepo + Vercel guides recommend this. **Test which works.**

### ✅ Verification

- Push to a branch and verify Vercel preview deployment works
- All pages render correctly
- Badge API works on the deployed URL

---

## Phase 10: Update Documentation + AGENTS.md

### TODO 10.1 — Rewrite `AGENTS.md`

Update all path references:
- `lib/badges/render.tsx` → `packages/core/src/badges/render.tsx`
- `lib/providers/` → `packages/core/src/providers/`
- `lib/badges/button-tokens.ts` → `packages/core/src/badges/button-tokens.ts`
- `app/[...slug]/route.ts` → `packages/web/app/[...slug]/route.ts`
- `content/docs/` → `packages/web/content/docs/`
- `app/page.tsx` → `packages/web/app/page.tsx`
- `app/showcase/page.tsx` → `packages/web/app/showcase/page.tsx`
- `app/gallery/page.tsx` → `packages/web/app/gallery/page.tsx`
- `app/sponsor/page.tsx` → `packages/web/app/sponsor/page.tsx`
- `app/token-pool/page.tsx` → `packages/web/app/token-pool/page.tsx`

Add new section about packages/core and packages/engine.

Update "When adding or updating a badge category" checklist with new paths.

### TODO 10.2 — Add `content/docs/self-hosting.mdx`

Self-hosting guide with:
- Prerequisites (Docker, Docker Compose)
- Quick start
- Environment variables
- Token pool setup
- Reverse proxy examples (nginx, Caddy, Traefik)
- Upgrading

### TODO 10.3 — Create `packages/engine/README.md`

Standalone self-hosting docs for people who find the Docker package on ghcr.io.

### TODO 10.4 — Update root `README.md`

Add "Self-Hosting" section with Docker quick start.

### TODO 10.5 — Update `packages/web/scripts/build-icon-index.ts`

This script writes to `lib/badges/icon-list.json` which is now at `packages/core/src/badges/icon-list.json`. Update the output path.

---

## Verification Checklist

Run after **every phase** to catch breakage early:

### Core checks

- [ ] `pnpm install` succeeds from repo root
- [ ] No `@/lib/` imports remain in `packages/core/` (all relative)
- [ ] `cd packages/core && npx tsc --noEmit` passes

### Web checks

- [ ] `pnpm --filter @shieldcn/web dev` starts
- [ ] `pnpm --filter @shieldcn/web build` succeeds
- [ ] Badge SVG: `curl localhost:3000/npm/v/react.svg` → valid SVG
- [ ] Badge PNG: `curl localhost:3000/npm/v/react.png -o test.png` → valid PNG
- [ ] Badge JSON: `curl localhost:3000/npm/v/react.json` → valid JSON
- [ ] Shields compat: `curl localhost:3000/npm/v/react/shields.json` → valid JSON
- [ ] Branded variant: `curl "localhost:3000/npm/v/react.svg?variant=branded"`
- [ ] Split mode: `curl "localhost:3000/npm/v/react.svg?split=true"`
- [ ] Gradient: `curl "localhost:3000/badge/hello-world-blue.svg?gradient=ff6b6b,4ecdc4"`
- [ ] GitHub badges (uses token pool): `curl localhost:3000/github/stars/facebook/react.svg`
- [ ] Error badge: `curl localhost:3000/nonexistent.svg` → error SVG
- [ ] Memo PUT: `curl -X PUT -H "Authorization: Bearer test" localhost:3000/memo/test/label/value/blue`
- [ ] Docs: `http://localhost:3000/docs` renders
- [ ] Gallery: `http://localhost:3000/gallery` renders
- [ ] Showcase: `http://localhost:3000/showcase` renders
- [ ] Landing page: `http://localhost:3000` renders with badge builder
- [ ] Registry: `curl localhost:3000/r/readme-badge.json` → JSON with inlined `content` field
- [ ] shadcn install: `cd packages/web && pnpm dlx shadcn@latest add tooltip` → installs to `components/ui/tooltip.tsx`
- [ ] Token pool page: `http://localhost:3000/token-pool` renders

### Engine checks

- [ ] `pnpm --filter @shieldcn/engine dev` starts on port 3001
- [ ] `pnpm --filter @shieldcn/engine build` succeeds
- [ ] Badge: `curl localhost:3001/npm/v/react.svg` → valid SVG
- [ ] Health: `curl localhost:3001/api/health` → JSON

### Docker checks

- [ ] `docker compose -f packages/engine/docker-compose.yml up --build` succeeds
- [ ] `curl localhost:3000/api/health` → `{ ok: true }`
- [ ] `curl localhost:3000/npm/v/react.svg` → valid SVG
- [ ] `curl localhost:3000/npm/v/react.png -o test.png` → valid PNG
- [ ] `curl localhost:3000/github/stars/facebook/react.svg` → valid SVG (with GITHUB_TOKEN)
- [ ] `curl localhost:3000/badge/self--hosted-green.svg` → static badge

### CI checks

- [ ] GitHub Actions: `commit-check.yml` still works
- [ ] GitHub Actions: `labeler.yml` labels correct paths
- [ ] Vercel preview deployment succeeds

---

## Risks + Mitigations

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **Font path breaks in core** — `render.tsx` uses `process.cwd()` to find TTFs | High | Fix in TODO 1.6 with `import.meta.url`. Test in dev + Docker. |
| 2 | **WASM loading in Docker** — resvg fetches from CDN, Docker may not have internet | Medium | Bundle WASM locally (Phase 7). Test PNG in container. |
| 3 | **Vercel deployment breaks** — root directory change + Turbo build order | Medium | Test on preview branch before merging. Have rollback plan (revert root directory setting). |
| 4 | **shadcn CLI can't find config** — `components.json` moved | Low | `@/` alias resolves to `packages/web/` via tsconfig. Run `shadcn add` from `packages/web/` dir. |
| 5 | **Registry file paths break** — `process.cwd()` change | Low | `process.cwd()` = `packages/web/` when Next.js runs there. Registry files moved to same relative position. Verify in TODO 2.8. |
| 6 | **Fumadocs can't find content** — `source.config.ts` relative paths | Low | `content/docs` is relative to `source.config.ts`, which moved alongside `content/`. No change needed. |
| 7 | **Import breakage during migration** — 60+ files need import updates | Medium | Do Phase 3 methodically, run `grep` verification after each batch. Build after each TODO. |
| 8 | **Docker standalone output missing files** — Next.js standalone may not copy all needed files | Medium | Explicitly COPY fonts and WASM in Dockerfile. Test with minimal badge render. |
| 9 | **`lint-staged` breaks** — ESLint config moved to `packages/web/` | Low | Either keep a root `eslint.config.mjs` that extends web, or update lint-staged to run from the right dir. |
| 10 | **`build-icon-index.ts` output path** — script writes to old `lib/badges/` path | Low | Update script output path in TODO 10.5. |
| 11 | **SSL on local Postgres** — current code auto-enables SSL for known hosts | Low | Fix in TODO 1.7 — default to no SSL unless connection string explicitly requests it. |
| 12 | **GitHub star button / `lib/github.ts`** — site uses `fetchGitHubRepo` for display | Low | Moved to core alongside providers. Import changes handled in Phase 3. |

---

## Rollback Plan

If anything goes catastrophically wrong mid-migration:

1. The migration should be done on a `refactor/monorepo` branch
2. Every phase is a separate commit (or small group of commits)
3. `git revert` any phase that breaks
4. Vercel root directory can be changed back to `.` (repo root) instantly
5. The old single-app structure works indefinitely — there's no deadline

---

## Estimated Effort

| Phase | Est. Time | Notes |
|---|---|---|
| Phase 0: Scaffold workspace | 15 min | Config files only |
| Phase 1: Create `packages/core` | 1–2 hr | Move 45 files, fix 30+ imports |
| Phase 2: Create `packages/web` | 30 min | Move directories, create package.json |
| Phase 3: Update imports | 1–2 hr | 7 app files + 1 component, verify each |
| Phase 4: Extract route handler | 1–2 hr | Biggest refactor — 1200 lines |
| Phase 5: Create engine | 30 min | Thin app, mostly copying |
| Phase 6: Dockerfile + compose | 30 min | Template + test |
| Phase 7: WASM bundling | 30 min | Copy + path fix |
| Phase 8: CI workflow | 15 min | YAML template |
| Phase 9: Vercel config | 15 min | Dashboard + test deploy |
| Phase 10: Docs updates | 1 hr | AGENTS.md, README, docs page |
| **Total** | **~7–9 hr** | |
