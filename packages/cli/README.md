<p align="center">
  <a href="https://shieldcn.dev">
    <img src="https://shieldcn.dev/badge/shieldcn-CLI-18181b.svg?variant=branded&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMzQgMzQiIGZpbGw9IndoaXRlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0yOC40NzEgNi43MDYzMlYxMi43NTIxSDE0LjI0NzVMMTAuMzk1NiAxOS4yMjY2QzEwLjI0NDkgMTkuNDgxMiA5Ljk3MTkgMTkuNjM1MiA5LjY3NTQ3IDE5LjYzNTJINi4zNjQ1M0M1LjkwMjMgMTkuNjM1MiA1LjUyNzE2IDE5LjI2MDEgNS41MjcxNiAxOC43OTc5VjEyLjc1MjFIMTMuNjMyOUwxNi45OTU3IDcuMDk2NTNDMTcuNDQ3OSA2LjMzNDUzIDE4LjI2ODUgNS44Njg5NiAxOS4xNTQ1IDUuODY4OTZIMjcuNjMzNkMyOC4wOTU4IDUuODY4OTYgMjguNDcxIDYuMjQ0MSAyOC40NzEgNi43MDYzMloiLz48cGF0aCBkPSJNNS41MjcyMyAyNy4yOTMyVjIxLjI0NzRIMTkuNzUwN0wyMy42MDI2IDE0Ljc3MjlDMjMuNzUzMyAxNC41MTg0IDI0LjAyNjMgMTQuMzY0MyAyNC4zMjI3IDE0LjM2NDNIMjcuNjM1NEMyOC4wOTc2IDE0LjM2NDMgMjguNDcyNyAxNC43Mzk0IDI4LjQ3MjcgMTUuMjAxN1YyMS4yNDc0SDIwLjM2N0wxNy4wMDQyIDI2LjkwM0MxNi41NTIgMjcuNjY1IDE1LjczMTQgMjguMTMwNiAxNC44NDU0IDI4LjEzMDZINi4zNjQ1OUM1LjkwMjM3IDI4LjEzMDYgNS41MjcyMyAyNy43NTU0IDUuNTI3MjMgMjcuMjkzMloiLz48L3N2Zz4=&size=lg" alt="shieldcn CLI" />
  </a>
</p>

<p align="center">
  Generate beautiful README badges from your terminal.<br />
  Scans your repo, detects your stack, and outputs copy-paste markdown.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/shieldcn-cli"><img src="https://shieldcn.dev/npm/shieldcn-cli.svg?variant=branded" alt="npm" /></a>
  <a href="https://shieldcn.dev"><img src="https://shieldcn.dev/badge/docs-shieldcn.dev-18181b.svg?variant=secondary" alt="docs" /></a>
  <a href="https://github.com/jal-co/shieldcn"><img src="https://shieldcn.dev/github/stars/jal-co/shieldcn.svg?variant=branded" alt="stars" /></a>
  <a href="https://github.com/jal-co/shieldcn/blob/main/LICENSE"><img src="https://shieldcn.dev/github/license/jal-co/shieldcn.svg?variant=ghost" alt="license" /></a>
</p>

## Quick start

```bash
# Scan current repo
npx shieldcn-cli

# Scan a GitHub repo
npx shieldcn-cli vercel/next.js

# Scan with a specific variant
npx shieldcn-cli vercel/next.js --variant branded
```

## What it does

1. **Detects** your GitHub repo from git remote (or pass a URL)
2. **Scans** package.json, lockfiles, config files, README, and FUNDING.yml
3. **Generates** categorized badge markdown for GitHub, npm, tooling, stack, and community
4. **Outputs** copy-paste markdown, HTML, or JSON

## Install

```bash
# Run without installing (recommended)
npx shieldcn-cli

# Or install globally
npm install -g shieldcn-cli
```

## Usage

### Generate badges

```bash
# Current directory (reads .git/config for remote)
npx shieldcn-cli

# GitHub URL or owner/repo
npx shieldcn-cli vercel/next.js
npx shieldcn-cli https://github.com/vercel/next.js

# Customize style
npx shieldcn-cli --variant branded --theme blue --size default

# Different output formats
npx shieldcn-cli --format flat     # one-line badges
npx shieldcn-cli --format html     # <img> tags
npx shieldcn-cli --json            # JSON config

# Copy to clipboard
npx shieldcn-cli --copy

# Compact output (no group headers)
npx shieldcn-cli --compact
```

### Inject into README

Add badges between markers in your README:

```bash
# Add markers to README (first time)
npx shieldcn-cli init

# Inject/update badges between markers
npx shieldcn-cli --inject
```

This adds badges between `<!-- shieldcn-start -->` and `<!-- shieldcn-end -->` markers. Re-running `--inject` replaces the content between markers.

### Migrate from shields.io

Convert existing shields.io URLs in your README to shieldcn:

```bash
# Preview changes
npx shieldcn-cli migrate --dry

# Apply changes (interactive)
npx shieldcn-cli migrate

# Apply without confirmation
npx shieldcn-cli migrate --write
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--variant` | Badge variant: `default`, `secondary`, `outline`, `ghost`, `destructive`, `branded` | `default` |
| `--size` | Badge size: `xs`, `sm`, `default`, `lg` | `sm` |
| `--theme` | Color theme: `zinc`, `slate`, `blue`, `green`, `rose`, `orange`, `violet`, `purple`, `cyan`, `emerald` | — |
| `--mode` | Color mode: `dark`, `light` | `dark` |
| `--format` | Output format: `markdown`, `flat`, `html`, `json` | `markdown` |
| `--inject` | Inject badges into README between markers | `false` |
| `--copy` | Copy output to clipboard | `false` |
| `--json` | Output as JSON (shortcut for `--format json`) | `false` |
| `--compact` | Output without group headers | `false` |

## What gets detected

| Category | Detects |
|----------|---------|
| **GitHub** | Stars, forks, watchers, contributors, last commit, issues, PRs, release, CI, license |
| **Package** | npm version, downloads (weekly/monthly/total), types, license |
| **Tooling** | Package manager (pnpm/yarn/bun/npm), TypeScript, ESLint, Prettier, Biome, Vite, Next.js, Nuxt, Astro, Svelte, Tailwind, Turborepo, Docker, Vitest, Playwright, Jest, Storybook, Vercel, Netlify, Cloudflare |
| **Stack** | 100+ npm packages mapped to branded badges (React, Prisma, Drizzle, tRPC, Supabase, Stripe, OpenAI, etc.) |
| **Modern** | ESM-only, tree-shakeable, dual package, monorepo, CLI tool, AGENTS.md, llms.txt, Claude/Cursor ready, MCP |
| **Community** | Discord invite (from README), GitHub Sponsors, Open Collective, Patreon, Ko-fi (from FUNDING.yml), homepage |

## Examples

### Scan a popular repo

```bash
$ npx shieldcn-cli shadcn-ui/ui --variant branded --compact

  shieldcn — beautiful README badges
  https://www.shieldcn.dev

  shadcn-ui/ui → https://github.com/shadcn-ui/ui

  ✓ GitHub (10)
  ✓ Package (6)
  ✓ Tooling (5)
  ✓ Stack (7)
  ✓ Community (2)
```

### Use in CI

```yaml
# .github/workflows/badges.yml
name: Update badges
on:
  push:
    branches: [main]

jobs:
  badges:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx shieldcn-cli --inject --variant branded
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: update badges"
```

## Related

- [shieldcn.dev](https://shieldcn.dev) — Badge service & documentation
- [shieldcn Generator](https://shieldcn.dev/gen) — Web-based badge generator
- [shieldcn Docs](https://shieldcn.dev/docs/cli) — CLI documentation

## License

MIT © [Justin Levine](https://justinlevine.me)
