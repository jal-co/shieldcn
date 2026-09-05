# shieldcn starchart

Star-history charts for your README — rendered as shadcn-styled SVG cards and
committed to your repo by a GitHub Action.

The action uses GitHub's privacy-safe star history API. It supports any public
repository and private repositories accessible to the supplied token.
For a hosted chart instead, see the [star history docs](https://shieldcn.dev/docs/charts/star-history).

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
  pull-requests: write

jobs:
  star-chart:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: jal-co/shieldcn@v1
        with:
          theme: violet
          pull-request: true
```

Then embed the generated pair in your README:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/shieldcn/star-chart-dark.svg">
  <img alt="Star history" src=".github/shieldcn/star-chart-light.svg">
</picture>
```

(The exact snippet is also exposed as the `snippet` output.)

## Pull requests and protected branches

Set `pull-request: true` to open a PR against the workflow repository's default
branch. The action updates `chore/shieldcn-star-chart` and reuses its open PR on
later runs. Only the generated chart files are committed. It never force-pushes
or pushes directly to the default branch in this mode.

Grant `contents: write` and `pull-requests: write`, and enable **Allow GitHub
Actions to create and approve pull requests** in the repository's Actions
settings. The action creates PRs but does not approve them or request reviewers.

`pull-request` defaults to `false`, preserving direct commits. `commit: false`
writes files only, even with PR mode enabled. The `pull-request-url` output
contains the existing or newly created PR URL. An unchanged chart creates no commit.
The `repo` input selects the chart's data source; the PR always targets
`GITHUB_REPOSITORY`, the repository running the workflow.

PRs created with `GITHUB_TOKEN` do not trigger ordinary push or pull-request
workflows. If required checks must run automatically, pass a GitHub App token
or personal access token through the existing `token` input. PR mode removes
`[skip ci]` from the default commit message; custom messages are left unchanged.

Use a workflow concurrency group to prevent overlapping runs from updating the
same chart branch. Keep `chore/shieldcn-star-chart` reserved for this action.
After its PR is merged or closed, the next update starts from the latest default
branch content and preserves branch ancestry without a force push.

## Inputs

| Input | Default | Description |
|---|---|---|
| `repo` | current repo | Repository to chart (`owner/repo`) |
| `token` | `github.token` | GitHub API token; metadata read access for private repos |
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
| `pull-request` | `false` | Open or update a chart PR instead of pushing directly; requires `commit: true` |
| `commit-message` | `chore: update star chart [skip ci]` | Commit message |

## Outputs

| Output | Description |
|---|---|
| `files` | Newline-separated written SVG paths |
| `stars` | Total stars reported by the history endpoint |
| `snippet` | Ready-to-paste README embed |
| `pull-request-url` | Chart PR URL, or empty when no PR is needed or PR mode is disabled |
| `committed` | Whether a commit was pushed |

## How it works

The action fetches every page of weekly star counts from
`GET /repos/{owner}/{repo}/stargazers/history`, using API version `2026-03-10`.
It reverses the weeks, accumulates counts from zero, and samples the completed
curve to at most 30 points. It uses the same fetcher and renderer as hosted
shieldcn charts, without a token pool or hosted cache. The total comes from
the history endpoint rather than a separate live count.

## Development

```bash
pnpm --filter @shieldcn/action build      # bundle src → dist/index.js (committed)
pnpm --filter @shieldcn/action typecheck
```

`dist/` must be rebuilt and committed when `src/` or the core chart renderer
changes — the release workflow verifies this before tagging.
