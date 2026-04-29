# shieldcn engine

Self-hosted badge rendering engine. Serves styled SVG/PNG badges as a standalone Docker container.

## Quick Start

```bash
# Using Docker Compose (includes Postgres)
git clone https://github.com/jal-co/shieldcn.git
cd shieldcn
docker compose -f packages/engine/docker-compose.yml up -d

# Test
curl http://localhost:3000/badge/hello-world-green.svg
curl http://localhost:3000/api/health
```

Or with the pre-built image:

```bash
docker pull ghcr.io/jal-co/shieldcn/engine:latest

docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/shieldcn \
  ghcr.io/jal-co/shieldcn/engine:latest
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `GITHUB_TOKEN` | — | — | GitHub personal access token (5k req/hr) |
| `GITHUB_OAUTH_CLIENT_ID` | — | — | GitHub OAuth App ID for token pool |
| `GITHUB_OAUTH_CLIENT_SECRET` | — | — | GitHub OAuth App secret |
| `YOUTUBE_API_KEY` | — | — | YouTube Data API v3 key |
| `UPSTASH_REDIS_REST_URL` | — | — | Upstash Redis URL for persistent cache |
| `UPSTASH_REDIS_REST_TOKEN` | — | — | Upstash Redis token |
| `NEXT_PUBLIC_URL` | — | `http://localhost:3000` | Base URL for OAuth callbacks |

## Endpoints

```
GET /{provider}/{...params}.svg     → SVG badge
GET /{provider}/{...params}.png     → PNG badge
GET /{provider}/{...params}.json    → raw JSON data
GET /api/health                     → health check
PUT /memo/{key}/{label}/{value}     → create memo badge
```

## Supported Providers

npm, GitHub, PyPI, crates.io, Docker Hub, Discord, Bluesky, JSR, YouTube, VS Code Marketplace, Open Collective, Hacker News, Mastodon, Lemmy, Packagist, RubyGems, NuGet, Pub.dev, Homebrew, Maven, CocoaPods, Codecov, WakaTime, Tokscale, IndieDevs, Reddit, Bundlephobia, and static/dynamic badges.

## Links

- [shieldcn.dev](https://shieldcn.dev) — hosted version + docs
- [API Reference](https://shieldcn.dev/docs/api-reference)
- [Self-Hosting Guide](https://shieldcn.dev/docs/self-hosting)
