# shieldcn starchart

Star-history charts for your README — rendered as shadcn-styled SVG cards and
committed to your repo by a GitHub Action.

GitHub [restricted the stargazers API](https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/)
to repo admins/collaborators, which broke every hosted star-chart service.
Inside a GitHub Action, the automatic `GITHUB_TOKEN` still has that access —
so this action fetches your star history on a schedule, renders the chart, and
commits it as `shieldcn[bot]`.

## Usage

```yaml
# .github/workflows/star-chart.yml
name: Star chart

on:
  schedule:
    - cron: "0 6 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  star-chart:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: jal-co/shieldcn@v1
        with:
          theme: violet
```

Then embed the generated pair in your README:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/shieldcn/star-chart-dark.svg">
  <img alt="Star history" src=".github/shieldcn/star-chart-light.svg">
</picture>
```

(The exact snippet is also exposed as the `snippet` output.)

## Inputs

| Input | Default | Description |
|---|---|---|
| `repo` | current repo | Repository to chart (`owner/repo`) |
| `token` | `github.token` | Token with stargazer read access |
| `output` | `.github/shieldcn/star-chart.svg` | Output path; `mode: both` inserts `-dark`/`-light` |
| `mode` | `both` | `dark`, `light`, or `both` |
| `theme` | — | Accent theme (`zinc`, `slate`, `blue`, `green`, `rose`, `orange`, `violet`, `purple`, `cyan`, `emerald`) |
| `color` | — | Explicit accent hex (no `#`), overrides `theme` |
| `background` | mode surface | `transparent` or hex |
| `border` | `true` | Rounded card border |
| `area` | `true` | Area fill under the line |
| `width` / `height` | `800` / `400` | Chart size in px |
| `title` / `subtitle` | `owner/repo` / star count | Card text |
| `font` | `inter` | Font stack keyword |
| `logo` | `true` | shieldcn watermark |
| `commit` | `true` | Commit + push as `shieldcn[bot]` |
| `commit-message` | `chore: update star chart [skip ci]` | Commit message |

## Outputs

| Output | Description |
|---|---|
| `files` | Newline-separated written SVG paths |
| `stars` | Current total star count |
| `snippet` | Ready-to-paste README embed |
| `committed` | Whether a commit was pushed |

## How it works

Same reconstruction strategy as [starcharts](https://github.com/caarlos0/starcharts):
repos under ~3k stars get an exact curve from every stargazer page; larger
repos sample pages evenly and read the first `starred_at` of each, up to
GitHub's 400-page (40k star) pagination cap, anchored at "now" with the live
total. Rendering goes through `@shieldcn/core`'s chart renderer — the same one
that powers shieldcn's other charts.

## Development

```bash
pnpm --filter @shieldcn/action build      # bundle src → dist/index.js (committed)
pnpm --filter @shieldcn/action typecheck
```

`dist/` must be rebuilt and committed when `src/` or the core chart renderer
changes — the release workflow verifies this before tagging.
