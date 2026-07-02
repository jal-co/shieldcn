# ── Base ──────────────────────────────────────────────
# Pinned by digest (node:22-alpine as of the last update) so a rebuild can't
# silently pull a different base image. Refresh the digest deliberately when
# bumping the base — `docker buildx imagetools inspect node:22-alpine`.
FROM node:26-alpine@sha256:725aeba2364a9b16beae49e180d83bd597dbd0b15c47f1f28875c290bfd255b9 AS base
# Node 25+ no longer bundles Corepack — install it explicitly
RUN npm install -g corepack@latest && corepack enable pnpm

# ── Dependencies ──────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/engine/package.json ./packages/engine/
RUN pnpm install --frozen-lockfile

# ── Builder ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/ ./
COPY packages/core/ ./packages/core/
COPY packages/engine/ ./packages/engine/
COPY turbo.json ./
RUN pnpm --filter @shieldcn/engine build

# ── Runner ────────────────────────────────────────────
FROM node:26-alpine@sha256:725aeba2364a9b16beae49e180d83bd597dbd0b15c47f1f28875c290bfd255b9 AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/packages/engine/.next/standalone ./
COPY --from=builder /app/packages/engine/.next/static ./packages/engine/.next/static

# Copy font files needed at runtime by core/badges/render.tsx
# The import.meta.url resolution in standalone mode resolves to the
# compiled file location, so we copy fonts relative to the server output.
COPY --from=builder /app/packages/core/src/fonts ./packages/core/src/fonts

# Copy resvg WASM binary for PNG rendering without CDN fetch
COPY --from=builder /app/node_modules/.pnpm/@resvg+resvg-wasm@*/node_modules/@resvg/resvg-wasm/index_bg.wasm ./node_modules/@resvg/resvg-wasm/index_bg.wasm

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"

# Baked into the image so `docker run` (not just compose) gets health status.
# Uses node's built-in fetch — no curl/wget dependency in the runtime image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "packages/engine/server.js"]
