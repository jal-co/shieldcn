# ── Base ──────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable pnpm

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
FROM node:22-alpine AS runner
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

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "packages/engine/server.js"]
