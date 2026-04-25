---
name: shieldcn-badges
description: Add beautiful shadcn/ui-styled README badges to projects using shieldcn. Use when adding badges, shields, or status indicators to README files, docs, or markdown. Triggers include "add badges", "add shields", "readme badges", "npm badge", "GitHub stars badge", "CI badge", "shieldcn", or any request to add project status badges to documentation.
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
| `logo` | SimpleIcons slug, `lucide:name`, `ri:Name`, `false` | auto | Icon source |
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
![badge](https://shieldcn.dev/github/stars/owner/repo.svg?logo=lucide:star)
```

### No icon

```md
![badge](https://shieldcn.dev/npm/react.svg?logo=false)
```

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
