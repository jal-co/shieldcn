<p align="center">
  <a href="https://shieldcn.dev">
    <img src="./brand/repo-header.png" alt="shieldcn" />
  </a>
</p>

<p align="center">
  Beautiful README badges.<br />
  A <a href="https://shields.io">shields.io</a> alternative styled as <a href="https://ui.shadcn.com">shadcn/ui</a> buttons. Never paywalled.
</p>

<p align="center">
  <a href="https://shieldcn.dev">Homepage</a> · <a href="https://shieldcn.dev/docs">Docs</a> · <a href="https://shieldcn.dev/docs/api-reference">API Reference</a>
</p>

<p align="center">
  <a href="https://github.com/jal-co/shieldcn/stargazers"><img src="https://shieldcn.dev/github/stars/jal-co/shieldcn.svg?variant=secondary" alt="stars" /></a>
  <a href="https://github.com/jal-co/shieldcn/network/members"><img src="https://shieldcn.dev/github/forks/jal-co/shieldcn.svg?variant=secondary" alt="forks" /></a>
  <a href="https://github.com/jal-co/shieldcn/blob/main/LICENSE"><img src="https://shieldcn.dev/github/license/jal-co/shieldcn.svg?variant=secondary" alt="license" /></a>
  <a href="https://github.com/jal-co/shieldcn/graphs/contributors"><img src="https://shieldcn.dev/github/contributors/jal-co/shieldcn.svg?variant=secondary" alt="contributors" /></a>
  <a href="https://github.com/jal-co/shieldcn/commits/main"><img src="https://shieldcn.dev/github/last-commit/jal-co/shieldcn.svg?variant=secondary" alt="last commit" /></a>
</p>

## About

shieldcn is an open-source badge service by [Justin Levine](https://justinlevine.me). Every badge is free, every endpoint is public, and that's not changing.

Badges are rendered as actual [shadcn/ui](https://ui.shadcn.com) Button components via [Satori](https://github.com/vercel/satori) — same font (Inter), same border-radius, same padding, same color tokens per variant and size. Not "inspired by" — the real thing, as SVG.

Built with [jal-co/ui](https://ui.justinlevine.me) components.

## Usage

```md
![npm](https://shieldcn.dev/npm/react.svg)
![stars](https://shieldcn.dev/github/stars/vercel/next.js.svg)
![CI](https://shieldcn.dev/github/ci/jal-co/ui.svg)
![license](https://shieldcn.dev/github/license/vercel/next.js.svg)
![discord](https://shieldcn.dev/discord/1316199667142496307.svg)
```

## Badge types (some examples)

### npm

| Badge | Example | URL |
|-------|---------|-----|
| Version | ![version](https://shieldcn.dev/npm/react.svg) | `/npm/{package}.svg` |
| Version (tag) | ![version](https://shieldcn.dev/npm/v/react/canary.svg?variant=outline) | `/npm/v/{package}[/{tag}].svg` |
| Downloads (weekly) | ![downloads](https://shieldcn.dev/npm/dw/react.svg?variant=branded) | `/npm/dw/{package}.svg` |
| Downloads (monthly) | ![downloads](https://shieldcn.dev/npm/dm/react.svg?variant=secondary) | `/npm/dm/{package}.svg` |
| Downloads (yearly) | ![downloads](https://shieldcn.dev/npm/dy/react.svg) | `/npm/dy/{package}.svg` |
| Downloads (total) | ![downloads](https://shieldcn.dev/npm/dt/react.svg?variant=ghost) | `/npm/dt/{package}.svg` |
| License | ![license](https://shieldcn.dev/npm/license/react.svg?variant=outline) | `/npm/license/{package}.svg` |
| Node version | ![node](https://shieldcn.dev/npm/node/next.svg?variant=secondary) | `/npm/node/{package}.svg` |
| TypeScript types | ![types](https://shieldcn.dev/npm/types/zod.svg?variant=branded&logo=typescript) | `/npm/types/{package}.svg` |
| Dependents | ![dependents](https://shieldcn.dev/npm/dependents/react.svg) | `/npm/dependents/{package}.svg` |

### GitHub

| Badge | Example | URL |
|-------|---------|-----|
| Stars | ![stars](https://shieldcn.dev/github/stars/vercel/next.js.svg?variant=secondary) | `/github/stars/{owner}/{repo}.svg` |
| Forks | ![forks](https://shieldcn.dev/github/forks/vercel/next.js.svg?variant=outline) | `/github/forks/{owner}/{repo}.svg` |
| Watchers | ![watchers](https://shieldcn.dev/github/watchers/vercel/next.js.svg?variant=ghost) | `/github/watchers/{owner}/{repo}.svg` |
| Branches | ![branches](https://shieldcn.dev/github/branches/vercel/next.js.svg) | `/github/branches/{owner}/{repo}.svg` |
| Releases | ![releases](https://shieldcn.dev/github/releases/vercel/next.js.svg?variant=secondary) | `/github/releases/{owner}/{repo}.svg` |
| Tags | ![tags](https://shieldcn.dev/github/tags/vercel/next.js.svg?variant=outline) | `/github/tags/{owner}/{repo}.svg` |
| Latest tag | ![tag](https://shieldcn.dev/github/tag/vercel/next.js.svg?variant=branded) | `/github/tag/{owner}/{repo}.svg` |
| License | ![license](https://shieldcn.dev/github/license/vercel/next.js.svg) | `/github/license/{owner}/{repo}.svg` |
| Release | ![release](https://shieldcn.dev/github/release/vercel/next.js.svg?variant=secondary) | `/github/release/{owner}/{repo}[/stable].svg` |
| Contributors | ![contributors](https://shieldcn.dev/github/contributors/vercel/next.js.svg?variant=outline) | `/github/contributors/{owner}/{repo}.svg` |
| CI status | ![ci](https://shieldcn.dev/github/ci/jal-co/shieldcn.svg) | `/github/ci/{owner}/{repo}.svg` |
| Checks | ![checks](https://shieldcn.dev/github/checks/vercel/next.js.svg?variant=ghost) | `/github/checks/{owner}/{repo}[/ref][/check].svg` |
| Issues | ![issues](https://shieldcn.dev/github/issues/vercel/next.js.svg?variant=destructive) | `/github/issues/{owner}/{repo}.svg` |
| Open issues | ![open issues](https://shieldcn.dev/github/open-issues/vercel/next.js.svg) | `/github/open-issues/{owner}/{repo}.svg` |
| Closed issues | ![closed issues](https://shieldcn.dev/github/closed-issues/vercel/next.js.svg?variant=secondary) | `/github/closed-issues/{owner}/{repo}.svg` |
| Label issues | ![label issues](https://shieldcn.dev/github/label-issues/vercel/next.js/bug.svg?variant=destructive) | `/github/label-issues/{owner}/{repo}/{label}[/state].svg` |
| PRs | ![prs](https://shieldcn.dev/github/prs/vercel/next.js.svg?variant=outline) | `/github/prs/{owner}/{repo}.svg` |
| Open PRs | ![open prs](https://shieldcn.dev/github/open-prs/vercel/next.js.svg?variant=secondary) | `/github/open-prs/{owner}/{repo}.svg` |
| Closed PRs | ![closed prs](https://shieldcn.dev/github/closed-prs/vercel/next.js.svg?variant=ghost) | `/github/closed-prs/{owner}/{repo}.svg` |
| Merged PRs | ![merged prs](https://shieldcn.dev/github/merged-prs/vercel/next.js.svg?theme=violet) | `/github/merged-prs/{owner}/{repo}.svg` |
| Commits | ![commits](https://shieldcn.dev/github/commits/vercel/next.js.svg?variant=secondary) | `/github/commits/{owner}/{repo}[/ref].svg` |
| Last commit | ![last commit](https://shieldcn.dev/github/last-commit/vercel/next.js.svg) | `/github/last-commit/{owner}/{repo}[/ref].svg` |
| Asset downloads | ![downloads](https://shieldcn.dev/github/assets-dl/vercel/next.js.svg?variant=outline) | `/github/assets-dl/{owner}/{repo}[/tag].svg` |
| Dependabot | ![dependabot](https://shieldcn.dev/github/dependabot/vercel/next.js.svg?variant=branded) | `/github/dependabot/{owner}/{repo}.svg` |

### Discord

| Badge | Example | URL |
|-------|---------|-----|
| Online count | ![online](https://shieldcn.dev/discord/1316199667142496307.svg?variant=branded) | `/discord/{serverId}.svg` |
| Members | ![members](https://shieldcn.dev/discord/members/reactiflux.svg?variant=secondary) | `/discord/members/{inviteCode}.svg` |
| Online members | ![online](https://shieldcn.dev/discord/online-members/reactiflux.svg?variant=outline) | `/discord/online-members/{inviteCode}.svg` |

### Reddit

| Badge | Example | URL |
|-------|---------|-----|
| Karma | ![karma](https://shieldcn.dev/reddit/karma/u/spez.svg?variant=branded) | `/reddit/{type}/u/{user}.svg` |
| Subscribers | ![subs](https://shieldcn.dev/reddit/subscribers/r/programming.svg?variant=secondary) | `/reddit/subscribers/r/{subreddit}.svg` |

### Static & Dynamic

| Badge | Example | URL |
|-------|---------|-----|
| Static | ![static](https://shieldcn.dev/badge/built%20with-shieldcn-blue.svg?variant=outline) | `/badge/{label}-{message}-{color}.svg` |
| Dynamic JSON | ![dynamic](https://shieldcn.dev/badge/dynamic/json.svg?url=https%3A%2F%2Fapi.github.com%2Frepos%2Fvercel%2Fnext.js&query=%24.stargazers_count&label=stars&logo=lucide:star&variant=secondary) | `/badge/dynamic/json.svg?url=...&query=...` |
| HTTPS endpoint | — | `/https/{hostname}/{path}.svg` |
| Memo | — | `/memo/{key}.svg` |

## Variants & sizes

Every badge supports shadcn Button variants and sizes:

```md
![default](https://shieldcn.dev/npm/react.svg)
![secondary](https://shieldcn.dev/npm/react.svg?variant=secondary)
![outline](https://shieldcn.dev/npm/react.svg?variant=outline)
![ghost](https://shieldcn.dev/npm/react.svg?variant=ghost)
![destructive](https://shieldcn.dev/npm/react.svg?variant=destructive)
![branded](https://shieldcn.dev/npm/react.svg?variant=branded)

![xs](https://shieldcn.dev/npm/react.svg?size=xs)
![sm](https://shieldcn.dev/npm/react.svg?size=sm)
![default](https://shieldcn.dev/npm/react.svg?size=default)
![lg](https://shieldcn.dev/npm/react.svg?size=lg)
```

## Icons

Three icon libraries (40,000+ icons) plus custom SVG upload:

- **[Simple Icons](https://simpleicons.org)** — `?logo=react`
- **[Lucide](https://lucide.dev/icons)** — `?logo=lucide:star`
- **[React Icons](https://react-icons.github.io/react-icons/)** — `?logo=ri:FaReact`
- **Custom SVG** — `?logo=data:image/svg+xml;base64,...` — upload any SVG icon via the Badge Builder or encode it yourself

## Response formats

- **`.svg`** — SVG image (default, for READMEs and docs)
- **`.png`** — rasterized PNG
- **`.json`** — raw badge data
- **`/shields.json`** — shields.io-compatible endpoint

## Design principles

- **shadcn buttons, not shields.io rectangles** — badges are rendered as actual shadcn Button components with real Inter font outlines via Satori
- **Everything configurable** — variant, size, mode, colors, icons, opacity, split, dot — but sensible defaults so you don't have to configure anything
- **Shields.io compatible** — same URL patterns for static/dynamic badges, same text encoding, shields.io JSON endpoint support
- **Open source, never paywalled** — every badge type, every variant, every icon source is free

## Local development

```bash
pnpm install        # install dependencies
pnpm dev            # start dev server
pnpm build          # next build
```

## Token pool

shieldcn uses a [token pool](https://shieldcn.dev/token-pool) (inspired by [shields.io](https://shields.io/blog/2024-11-14-how-shields-io-uses-the-github-api)) to distribute GitHub API requests across many tokens. You can help by authorizing the OAuth app — read-only, zero scopes, revocable anytime.

## Credits

- **[shields.io](https://shields.io)** — the original badge service. Inspiration for URL patterns, static badge format, and the token pool system.
- **[badgen.net](https://badgen.net)** — inspiration for many badge types and endpoint structures, especially the GitHub badge coverage.
- **[shadcn/ui](https://ui.shadcn.com)** — the design system these badges are built on.
- **[Satori](https://github.com/vercel/satori)** — Vercel's JSX-to-SVG engine that makes rendering React components as badge images possible.
- **[jal-co/ui](https://ui.justinlevine.me)** — the component library powering the docs site.
- **[@k33bs](https://github.com/k33bs)** — creator of [shieldcngen](https://github.com/k33bs/shieldcngen), the badge generator tool powering the [`/gen`](https://shieldcn.dev/gen) page.

## Contributing

PRs welcome. See [AGENTS.md](./AGENTS.md) for architecture overview.

## License

[MIT](./LICENSE)
