<p align="center">
  <a href="https://shieldcn.dev">
    <img src="./packages/web/brand/repo-header.png" alt="shieldcn" />
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
  <a href="https://github.com/jal-co/shieldcn/stargazers"><img src="https://shieldcn.dev/github/stars/jal-co/shieldcn.svg?variant=branded" alt="stars" /></a>
  <a href="https://github.com/jal-co/shieldcn/network/members"><img src="https://shieldcn.dev/github/forks/jal-co/shieldcn.svg?variant=branded" alt="forks" /></a>
  <a href="https://github.com/jal-co/shieldcn/blob/main/LICENSE"><img src="https://shieldcn.dev/github/license/jal-co/shieldcn.svg?variant=branded" alt="license" /></a>
  <a href="https://github.com/jal-co/shieldcn/graphs/contributors"><img src="https://shieldcn.dev/github/contributors/jal-co/shieldcn.svg?variant=branded" alt="contributors" /></a>
  <a href="https://github.com/jal-co/shieldcn/commits/main"><img src="https://shieldcn.dev/github/last-commit/jal-co/shieldcn.svg?variant=branded" alt="last commit" /></a>
  <a href="https://shieldcn.dev/docs/self-hosting"><img src="https://shieldcn.dev/badge/host%20with-docker-2496ED.svg?variant=branded&logo=docker" alt="host with docker" /></a>
  <a href="https://openpanel.dev?ref=justinlevine.me"><img src="https://shieldcn.dev/badge/analytics%20by-openpanel.svg?variant=branded&logo=openpanel" alt="analytics by openpanel" /></a>
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

## Supported providers

See the [docs](https://shieldcn.dev/docs) for full endpoint details, interactive sandboxes, and copy-paste examples.

### Package registries

| Provider | Badges | Endpoint |
|----------|--------|----------|
| **npm** | version, downloads, license, node, types, dependents | `/npm/{package}` |
| **PyPI** | version, downloads, license, python version | `/pypi/{package}` |
| **Crates.io** | version, downloads, license | `/crates/{crate}` |
| **Docker Hub** | pulls, stars, version, image size | `/docker/pulls/{image}` |
| **Packagist** | version, downloads, license | `/packagist/v/{vendor}/{package}` |
| **RubyGems** | version, downloads, license | `/rubygems/{gem}` |
| **NuGet** | version, downloads | `/nuget/{package}` |
| **Pub.dev** | version, likes, points, popularity | `/pub/{package}` |
| **Homebrew** | version (formula + cask), installs, downloads | `/homebrew/{formula}` |
| **Maven Central** | version | `/maven/{groupId}/{artifactId}` |
| **CocoaPods** | version | `/cocoapods/{pod}` |
| **JSR** | version, score | `/jsr/{@scope}/{name}` |
| **Bundlephobia** | min size, minzip size, tree-shaking | `/bundlephobia/minzip/{package}` |

### Code platforms

| Provider | Badges | Endpoint |
|----------|--------|----------|
| **GitHub** | stars, forks, watchers, license, release, CI, checks, issues, PRs, milestones, commits, downloads (all/specific asset, all/latest/tag), dependabot, and more | `/github/{owner}/{repo}/{topic}` |
| **Codecov** | coverage percentage (color-coded) | `/codecov/{service}/{owner}/{repo}` |
| **VS Code Marketplace** | installs, rating, version | `/vscode/installs/{publisher}/{extension}` |

### Social

| Provider | Badges | Endpoint |
|----------|--------|----------|
| **Discord** | online count, members | `/discord/{serverId}` |
| **Reddit** | karma, subscribers | `/reddit/subscribers/r/{subreddit}` |
| **Bluesky** | followers, following, posts | `/bluesky/{handle}` |
| **YouTube** | subscribers, channel views, video views, likes, comments | `/youtube/subscribers/{channelId}` |
| **Mastodon** | followers, following, posts | `/mastodon/followers/{instance}/{acct}` |
| **Lemmy** | subscribers, posts, comments | `/lemmy/subscribers/{instance}/{community}` |
| **Hacker News** | karma | `/hackernews/{userId}` |
| **Twitch** | live status, followers | `/twitch/status/{login}` |

### Funding & Tools

| Provider | Badges | Endpoint |
|----------|--------|----------|
| **Open Collective** | backers, sponsors, contributors, balance, budget | `/opencollective/backers/{slug}` |
| **WakaTime** | coding time | `/wakatime/{username}` |
| **Tokscale** | tokens, cost, rank, active days | `/tokscale/{username}` |

### Custom badges

| Type | Description | Endpoint |
|------|-------------|----------|
| **Static** | Custom label/message/color | `/badge/{label}-{message}-{color}` |
| **Dynamic JSON** | Fetch any JSON API | `/badge/dynamic/json?url=...&query=...` |
| **HTTPS Endpoint** | Proxy any JSON endpoint | `/https/{hostname}/{path}` |
| **Memo** | User-stored badges (PUT API) | `/memo/{key}` |

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
- **[React Icons](https://react-icons.github.io/react-icons/)** — `?logo=ri:GoStarFill`
- **[React Icons](https://react-icons.github.io/react-icons/)** — `?logo=ri:FaReact`
- **Custom SVG** — `?logo=data:image/svg+xml;base64,...` — upload any SVG icon via the Badge Builder or encode it yourself

## Response formats

- **`.png`** — PNG image (recommended for GitHub READMEs and maximum compatibility)
- **`.svg`** — SVG image (scalable, smaller file size)
- **`.json`** — raw badge data
- **`/shields.json`** — shields.io-compatible endpoint

Both `.png` and `.svg` work everywhere GitHub renders images. Just swap the extension.

## Design principles

- **shadcn buttons, not shields.io rectangles** — badges are rendered as actual shadcn Button components with real Inter font outlines via Satori
- **Everything configurable** — variant, size, mode, colors, icons, opacity, split, dot — but sensible defaults so you don't have to configure anything
- **Shields.io compatible** — same URL patterns for static/dynamic badges, same text encoding, shields.io JSON endpoint support
- **Open source, never paywalled** — every badge type, every variant, every icon source is free

## Agent skill

Install the shieldcn skill to let AI coding agents (Claude Code, Cursor, Codex, and [40+ more](https://github.com/vercel-labs/skills#supported-agents)) add badges to your projects:

```bash
npx skills add jal-co/shieldcn
```

Once installed, ask your agent to _"add shieldcn badges to the README"_ — it knows all providers, URL patterns, and query parameters.

Learn more in the [skill docs](https://shieldcn.dev/docs/skill).

## Self-Hosting

Run your own badge engine with Docker:

```bash
git clone https://github.com/jal-co/shieldcn.git
cd shieldcn
docker compose -f packages/engine/docker-compose.yml up -d

# Test it
curl http://localhost:3000/badge/self--hosted-green.svg
```

Or pull the pre-built image:

```bash
docker pull ghcr.io/jal-co/shieldcn/engine:latest
```

See the [Self-Hosting Guide](https://shieldcn.dev/docs/self-hosting) for full setup details.

## Local Development

```bash
pnpm install             # install all workspace deps
pnpm dev:web             # start the web site
pnpm dev:engine          # start the self-hosted engine
pnpm build:web           # build the web site
pnpm build:engine        # build the engine
```

The repo is a Turborepo monorepo with three packages:
- `packages/core` — shared badge engine library
- `packages/web` — marketing site (Vercel)
- `packages/engine` — self-hosted Docker image


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

To add shadcn components: `cd packages/web && pnpm dlx shadcn@latest add {component}`

## License

[MIT](./LICENSE)
