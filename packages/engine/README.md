# shieldcn engine

Self-hosted badge rendering engine. Serves styled SVG/PNG badges as a standalone Docker container.

## Quick Start

Create a `docker-compose.yml`:

```yaml
services:
  engine:
    image: ghcr.io/jal-co/shieldcn/engine:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://shieldcn:shieldcn@postgres:5432/shieldcn
    depends_on:
      postgres:
        condition: service_healthy
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

Then run:

```bash
docker compose up -d

# Verify it's working
curl http://localhost:3000/api/health/
curl http://localhost:3000/badge/self--hosted-green.svg
```

That's it. Badges are served at `http://localhost:3000`.

## Usage

Once running, use badge URLs the same way as [shieldcn.dev](https://shieldcn.dev) — just replace the domain:

```
http://localhost:3000/npm/v/react.svg
http://localhost:3000/github/stars/facebook/react.svg
http://localhost:3000/badge/my-app-v1.2.3-blue.svg
http://localhost:3000/badge/status-live-green.svg?variant=branded
```

Use them in Markdown:

```md
![npm](http://localhost:3000/npm/v/react.svg)
![stars](http://localhost:3000/github/stars/facebook/react.svg)
```

All query parameters from the [API Reference](https://shieldcn.dev/docs/api-reference) work — `variant`, `size`, `mode`, `theme`, `logo`, `color`, `gradient`, etc.

## GitHub Badges

GitHub badges hit the GitHub API which has a rate limit of 60 requests/hour without a token. To raise this to 5,000/hour, add a `GITHUB_TOKEN`:

```yaml
services:
  engine:
    image: ghcr.io/jal-co/shieldcn/engine:latest
    environment:
      - DATABASE_URL=postgresql://shieldcn:shieldcn@postgres:5432/shieldcn
      - GITHUB_TOKEN=ghp_your_token_here
```

Create a token at [github.com/settings/tokens](https://github.com/settings/tokens) — no scopes needed (public data only).

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
GET /api/health/                    → health check
PUT /memo/{key}/{label}/{value}     → create memo badge
```

## Supported Providers

npm, GitHub, PyPI, crates.io, Docker Hub, Discord, Bluesky, JSR, YouTube, VS Code Marketplace, Open Collective, Hacker News, Mastodon, Lemmy, Packagist, RubyGems, NuGet, Pub.dev, Homebrew, Maven, CocoaPods, Codecov, WakaTime, Tokscale, IndieDevs, Reddit, Bundlephobia, and static/dynamic badges.

## Upgrading

```bash
docker compose pull
docker compose up -d
```

## Links

- [shieldcn.dev](https://shieldcn.dev) — hosted version + docs
- [API Reference](https://shieldcn.dev/docs/api-reference)
- [Self-Hosting Guide](https://shieldcn.dev/docs/self-hosting)
