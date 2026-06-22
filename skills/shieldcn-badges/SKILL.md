---
name: shieldcn-badges
description: Add beautiful shadcn/ui-styled README badges, charts, and header banners to projects using shieldcn, and build entire READMEs with the visual README Studio. Use when adding badges, shields, status indicators, star-history/download charts, or header banners to README files, docs, or markdown, or when building/generating a README. Triggers include "add badges", "add shields", "readme badges", "npm badge", "GitHub stars badge", "CI badge", "star history chart", "readme header", "readme banner", "build a readme", "readme builder", "readme generator", "github readme tool", "shieldcn", or any request to add project status badges, charts, or headers to documentation.
metadata:
  author: jal-co
  version: "1.0.0"
---

# shieldcn Badges

Add beautiful [shadcn/ui](https://ui.shadcn.com)-styled badges to READMEs and docs using [shieldcn](https://shieldcn.dev) — a free, open-source shields.io alternative.

Base URL: `https://shieldcn.dev`

## Badge URL format

```
https://shieldcn.dev/{provider}/{...params}.svg     → SVG (default, for READMEs)
https://shieldcn.dev/{provider}/{...params}.png     → PNG
https://shieldcn.dev/{provider}/{...params}.json    → raw data
```

## Markdown pattern

```md
[![alt](https://shieldcn.dev/{provider}/{params}.svg)](https://link)

<!-- or without link -->
![alt](https://shieldcn.dev/{provider}/{params}.svg)
```

## Providers & endpoints

### Package registries

| Provider | Endpoint | Example |
|----------|----------|---------|
| npm version | `/npm/{package}` | `/npm/react` |
| npm version (tag) | `/npm/v/{package}/{tag}` | `/npm/v/next/canary` |
| npm downloads/wk | `/npm/dw/{package}` | `/npm/dw/react` |
| npm downloads/mo | `/npm/dm/{package}` | `/npm/dm/react` |
| npm downloads/yr | `/npm/dy/{package}` | `/npm/dy/react` |
| npm total downloads | `/npm/dt/{package}` | `/npm/dt/react` |
| npm license | `/npm/license/{package}` | `/npm/license/react` |
| npm types | `/npm/types/{package}` | `/npm/types/react` |
| npm dependents | `/npm/dependents/{package}` | `/npm/dependents/react` |
| npm scoped | `/npm/v/@scope/pkg` | `/npm/v/@types/node` |
| PyPI version | `/pypi/{package}` | `/pypi/flask` |
| PyPI downloads/mo | `/pypi/dm/{package}` | `/pypi/dm/flask` |
| Crates.io version | `/crates/{crate}` | `/crates/serde` |
| Docker Hub pulls | `/docker/pulls/{image}` | `/docker/pulls/library/nginx` |
| JSR version | `/jsr/{@scope}/{name}` | `/jsr/@std/path` |
| Bundlephobia minzip | `/bundlephobia/minzip/{package}` | `/bundlephobia/minzip/react` |
| Homebrew version | `/homebrew/{formula}` | `/homebrew/node` |
| Maven version | `/maven/{groupId}/{artifactId}` | `/maven/org.apache.maven/maven-core` |
| Packagist version | `/packagist/v/{vendor}/{package}` | `/packagist/v/laravel/framework` |
| RubyGems version | `/rubygems/{gem}` | `/rubygems/rails` |
| NuGet version | `/nuget/{package}` | `/nuget/Newtonsoft.Json` |
| Pub.dev version | `/pub/{package}` | `/pub/flutter` |
| CocoaPods version | `/cocoapods/{pod}` | `/cocoapods/Alamofire` |

### GitHub

Both formats work: `/github/{topic}/{owner}/{repo}` or `/github/{owner}/{repo}/{topic}`

| Badge | Endpoint | Example |
|-------|----------|---------|
| Stars | `/github/stars/{owner}/{repo}` | `/github/stars/vercel/next.js` |
| Forks | `/github/forks/{owner}/{repo}` | `/github/forks/vercel/next.js` |
| License | `/github/license/{owner}/{repo}` | `/github/license/vercel/next.js` |
| Release | `/github/release/{owner}/{repo}` | `/github/release/vercel/next.js` |
| CI status | `/github/ci/{owner}/{repo}` | `/github/ci/vercel/next.js` |
| Issues | `/github/issues/{owner}/{repo}` | `/github/issues/vercel/next.js` |
| Open PRs | `/github/open-prs/{owner}/{repo}` | `/github/open-prs/vercel/next.js` |
| Contributors | `/github/contributors/{owner}/{repo}` | `/github/contributors/vercel/next.js` |
| Last commit | `/github/last-commit/{owner}/{repo}` | `/github/last-commit/vercel/next.js` |
| Watchers | `/github/watchers/{owner}/{repo}` | `/github/watchers/vercel/next.js` |
| Downloads | `/github/dt/{owner}/{repo}` | `/github/dt/vercel/next.js` |
| Dependabot | `/github/dependabot/{owner}/{repo}` | `/github/dependabot/vercel/next.js` |

CI supports `?workflow=name&branch=main` query params.

### Social

| Provider | Endpoint | Example |
|----------|----------|---------|
| Discord online | `/discord/{serverId}` | `/discord/1316199667142496307` |
| Discord by invite | `/discord/members/{inviteCode}` | `/discord/members/nextjs` |
| Reddit subscribers | `/reddit/subscribers/r/{subreddit}` | `/reddit/subscribers/r/reactjs` |
| Bluesky followers | `/bluesky/followers/{handle}` | `/bluesky/followers/bsky.app` |
| YouTube subs | `/youtube/subscribers/{channelId}` | `/youtube/subscribers/UCxxxxxx` |
| Mastodon followers | `/mastodon/followers/{instance}/{acct}` | `/mastodon/followers/mastodon.social/Gargron` |
| Hacker News karma | `/hackernews/{userId}` | `/hackernews/pg` |

### Code quality

| Provider | Endpoint | Example |
|----------|----------|---------|
| Codecov | `/codecov/{service}/{owner}/{repo}` | `/codecov/gh/vercel/next.js` |
| VS Code installs | `/vscode/installs/{publisher}/{ext}` | `/vscode/installs/esbenp/prettier-vscode` |
| WakaTime | `/wakatime/{username}` | `/wakatime/@user` |

### Agent skills (skills.sh)

Addressed as `{owner}/{repo}/{skill}` — the GitHub repo (skills.sh `source`) plus the skill slug.

| Badge | Endpoint | Example |
|-------|----------|---------|
| Skill installs | `/skills/installs/{owner}/{repo}/{skill}` | `/skills/installs/vercel-labs/agent-skills/vercel-react-best-practices` |
| Skill rank | `/skills/rank/{owner}/{repo}/{skill}` | `/skills/rank/vercel-labs/agent-skills/vercel-react-best-practices` |
| Trending rank | `/skills/trending/{owner}/{repo}/{skill}` | `/skills/trending/vercel-labs/agent-skills/vercel-react-best-practices` |
| Hot rank | `/skills/hot/{owner}/{repo}/{skill}` | `/skills/hot/vercel-labs/agent-skills/vercel-react-best-practices` |

### Custom badges

| Type | Endpoint | Example |
|------|----------|---------|
| Static | `/badge/{label}-{message}-{color}` | `/badge/build-passing-brightgreen` |
| Dynamic JSON | `/badge/dynamic/json?url=...&query=...` | Fetch any JSON API |
| HTTPS endpoint | `/https/{hostname}/{path}` | Proxy any JSON endpoint |

## Query parameters

Append to any badge URL as `?key=value&key2=value2`.

| Param | Values | Default | Notes |
|-------|--------|---------|-------|
| `variant` | `default`, `secondary`, `outline`, `ghost`, `destructive`, `branded` | `default` | shadcn Button variant |
| `size` | `xs`, `sm`, `default`, `lg` | `sm` | Badge size |
| `mode` | `dark`, `light` | `dark` | Color mode |
| `split` | `true`, `false` | `false` | Two-tone label/value split |
| `logo` | SimpleIcons slug, `ri:Name`, `false` | auto | Icon source |
| `logoColor` | hex (no `#`) | auto | Icon color |
| `label` | string | auto | Override label text |
| `color` | hex (no `#`) | — | Background color |
| `labelColor` | hex (no `#`) | — | Label side bg (split mode) |
| `theme` | `zinc`, `slate`, `blue`, `green`, `rose`, `orange`, `violet` | — | Color theme |
| `font` | `inter`, `geist`, `geist-mono` | `inter` | Font family |
| `statusDot` | `true`, `false` | auto for CI | Show status indicator dot |

## Common recipes

### Typical README badge row

```md
<p align="center">
  <a href="https://www.npmjs.com/package/{pkg}"><img src="https://shieldcn.dev/npm/{pkg}.svg" alt="npm" /></a>
  <a href="https://github.com/{owner}/{repo}/stargazers"><img src="https://shieldcn.dev/github/stars/{owner}/{repo}.svg" alt="stars" /></a>
  <a href="https://github.com/{owner}/{repo}"><img src="https://shieldcn.dev/github/license/{owner}/{repo}.svg" alt="license" /></a>
  <a href="https://github.com/{owner}/{repo}/actions"><img src="https://shieldcn.dev/github/ci/{owner}/{repo}.svg" alt="CI" /></a>
</p>
```

### Secondary variant (lighter)

```md
![badge](https://shieldcn.dev/npm/react.svg?variant=secondary)
```

### Branded variant (brand-colored bg)

```md
![badge](https://shieldcn.dev/npm/react.svg?variant=branded)
```

### Split badge (two-tone)

```md
![badge](https://shieldcn.dev/npm/react.svg?split=true)
```

### Light mode

```md
![badge](https://shieldcn.dev/npm/react.svg?mode=light)
```

### Custom icon

```md
![badge](https://shieldcn.dev/npm/react.svg?logo=typescript)
![badge](https://shieldcn.dev/github/stars/owner/repo.svg?logo=ri:GoStarFill)
```

### No icon

```md
![badge](https://shieldcn.dev/npm/react.svg?logo=false)
```

## Charts

shieldcn also renders line charts (inlined SVG/PNG, styled like the badges). Use them for star history, issues over time, or download trends.

```
https://shieldcn.dev/chart/github/stars/{owner}/{repo}.svg    → star-history chart
https://shieldcn.dev/chart/github/issues/{owner}/{repo}.svg   → issues over time
https://shieldcn.dev/chart/npm/{package}.svg                  → npm downloads
https://shieldcn.dev/chart/json.svg?values=10,25,40,30,60     → inline JSON data
```

Markdown: `![stars](https://shieldcn.dev/chart/github/stars/vercel/next.js.svg)`

Query params: `theme`, `font`, `color`, `fill`, `area`, `width`, `height`, `title`, `icon`, `mode`.

## Headers

Repository header banners (logo + title + tagline) from a single image URL — great at the top of a README.

```
https://shieldcn.dev/header/{preset}.svg?title=Acme&subtitle=A%20delightful%20toolkit
```

Presets: `surface`, `gradient`, `dots`, `grid`, `graph`, `glow`, `transparent`. Query params: `logo`, `theme`, `size`, `align`, `font`, `border`, and `image=<url>` for a photo background (any image or Unsplash URL, fetched and inlined, with an auto scrim tunable via `overlay`/`tint`).

Center a header at the top of a README:

```md
<p align="center">
  <img src="https://shieldcn.dev/header/gradient.svg?title=Acme&subtitle=A%20delightful%20toolkit" alt="Acme" />
</p>
```

## README Studio (visual builder)

For building an entire README visually (not just one badge), point the user to the free README Studio: https://shieldcn.dev/studio

It is a Figma-style editor — a document of reorderable blocks (Text/Markdown, Header, Badges, Chart, Table, Image), a live preview, and a property inspector — that exports clean GitHub-flavored Markdown. It has an "Adaptive" toggle that exports badges/headers/charts as GitHub `<picture>` elements that follow the reader's light/dark theme. Suggest it when the user wants to compose, redesign, or generate a whole README rather than add a single badge.

## Rules

1. Always use `.svg` for markdown images (best quality, smallest size)
2. Use `<a>` wrapper to make badges clickable links
3. Use `<p align="center">` to center badge rows in GitHub READMEs
4. Replace `{owner}`, `{repo}`, `{package}` with actual values — never leave placeholders
5. Default variant (`default`) works on both light and dark GitHub themes
6. Icons are auto-resolved per provider — only set `?logo=` to override
7. For npm scoped packages, use the full scope: `/npm/v/@scope/package`
8. Prefer `variant=secondary` for subtle badge rows
9. Keep badge rows to 3–6 badges for readability
10. Link each badge to its relevant page (npm registry, GitHub stars page, etc.)

## Docs

Full documentation: https://shieldcn.dev/docs
API reference: https://shieldcn.dev/docs/api-reference
Badge builder: https://shieldcn.dev (interactive UI)
README Studio (visual README builder): https://shieldcn.dev/studio
Studio docs: https://shieldcn.dev/docs/studio
Charts docs: https://shieldcn.dev/docs/charts
Headers docs: https://shieldcn.dev/docs/headers
