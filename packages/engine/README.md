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

  # ⚠️ Change POSTGRES_PASSWORD (and the matching DATABASE_URL above) before
  # deploying anywhere reachable beyond your own machine — "shieldcn" is a
  # placeholder, not a real credential.
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
| `GITHUB_OAUTH_CLIENT_SECRET` | — | — | GitHub OAuth App secret. Also used to derive the token pool's encryption key if `TOKEN_ENCRYPTION_KEY` isn't set (see below). |
| `TOKEN_ENCRYPTION_KEY` | — | — | Encryption key for donated GitHub tokens stored in the pool. Recommended for any real deployment — set this explicitly rather than relying on `GITHUB_OAUTH_CLIENT_SECRET` doubling as the key, since rotating that secret would then also silently break decryption of already-stored tokens. **Required in production**: if neither this nor `GITHUB_OAUTH_CLIENT_SECRET` is set and `NODE_ENV=production`, adding a token to the pool fails loudly rather than encrypting it with a guessable fallback. |
| `YOUTUBE_API_KEY` | — | — | YouTube Data API v3 key |
| `TWITCH_CLIENT_ID` | — | — | Twitch application client ID (for `/twitch/*` badges) |
| `TWITCH_CLIENT_SECRET` | — | — | Twitch application client secret |
| `UPSTASH_REDIS_REST_URL` | — | — | Upstash Redis URL for persistent cache |
| `UPSTASH_REDIS_REST_TOKEN` | — | — | Upstash Redis token |
| `NEXT_PUBLIC_URL` | — | `http://localhost:3000` | Base URL for OAuth callbacks |
| `NEXT_PUBLIC_SENTRY_DSN` | — | — | Sentry DSN for error monitoring. Leave unset to run without it. |
| `SENTRY_TRACES_SAMPLE_RATE` | — | `0.1` | Fraction (0–1) of requests traced. Default samples 10% — raise toward `1` only for low-traffic deployments. |
| `SENTRY_PROFILES_SAMPLE_RATE` | — | `0.1` | Fraction (0–1) of traced requests profiled (server runtime only). |
| `SHIELDCN_ALLOW_PRIVATE_FETCH` | — | `false` | Set to `true` only if you intentionally want badges (dynamic JSON, `/https`, header logo/image, chart `?url=`, and instance-host providers like Mastodon/Lemmy) to be able to reach private/loopback/link-local/metadata addresses on your network. Unset keeps the SSRF guard fully enforced — enabling this turns the badge route into a proxy into your private network, so only set it if you understand that tradeoff. |

## Endpoints

```
GET /{provider}/{...params}.svg      → SVG badge
GET /{provider}/{...params}.png      → PNG badge
GET /{provider}/{...params}.json     → raw JSON data
GET /api/health/                     → health check
PUT /memo/{key}/{label}/{value}      → create memo badge
POST /api/gen-count                  → increment the badge-generation counter (rate-limited, capped at 100/request)
GET /api/auth/github                 → start the GitHub OAuth flow for the token pool (see below)
GET /api/auth/github/callback        → OAuth callback; stores a zero-scope token in the pool
```

### GitHub token pool

If you're hitting GitHub's unauthenticated rate limit even with `GITHUB_TOKEN`
set, visitors can donate their own read-only GitHub token to a shared pool via
`GET /api/auth/github`. Requires `GITHUB_OAUTH_CLIENT_ID` and
`GITHUB_OAUTH_CLIENT_SECRET` (see `.env.example`) and, for a real deployment,
`TOKEN_ENCRYPTION_KEY` (see above). The OAuth app should request no scopes —
the callback rejects any token GitHub reports as scoped, since the pool only
ever holds read-only public-data access.

## Supported Providers

npm, GitHub, PyPI, crates.io, Docker Hub, Discord, Bluesky, JSR, YouTube, VS Code Marketplace, Open Collective, Hacker News, Mastodon, Lemmy, Packagist, RubyGems, NuGet, Pub.dev, Homebrew, Maven, CocoaPods, Codecov, WakaTime, Tokscale, IndieDevs, Reddit, Bundlephobia, Twitch (requires `TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET`), and static/dynamic badges. See the [full provider list](https://shieldcn.dev/docs/api-reference) — this is a highlight reel, not exhaustive.

## Upgrading

```bash
docker compose pull
docker compose up -d
```

## Links

- [shieldcn.dev](https://shieldcn.dev) — hosted version + docs
- [API Reference](https://shieldcn.dev/docs/api-reference)
- [Self-Hosting Guide](https://shieldcn.dev/docs/self-hosting)
