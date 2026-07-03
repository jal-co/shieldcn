/**
 * shieldcn
 * lib/ai.ts
 *
 * AI model factory for the Studio's Plus features. Models are resolved through
 * the Vercel AI Gateway, so a single AI_MODEL id (e.g. "anthropic/claude-...")
 * picks the provider and the gateway handles keys/routing/observability.
 * Auth is either AI_GATEWAY_API_KEY or the Vercel OIDC token (present on
 * Vercel deploys and in local `vercel env pull`).
 *
 * The gateway model is wrapped with Polar's LLM ingestion strategy so token
 * usage is metered per organization (the external customer id) — Polar owns the
 * credit balance and overage.
 */

import { gateway } from "ai"
import type { LanguageModel } from "ai"
import { Ingestion } from "@polar-sh/ingestion"
import { LLMStrategy } from "@polar-sh/ingestion/strategies/LLM"

const AI_MODEL = process.env.AI_MODEL ?? "anthropic/claude-sonnet-4.5"
/** Polar meter name the LLM strategy ingests token events under. */
const AI_METER = "ai_tokens"
const polarToken = process.env.POLAR_ACCESS_TOKEN
const polarServer = (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox"

/**
 * AI is usable when the gateway can authenticate — either an explicit gateway
 * key or a Vercel OIDC token (injected on Vercel, or via `vercel env pull`).
 */
export const aiConfigured = Boolean(
  process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
)

/** Resolve the gateway model from the AI_MODEL env string. */
function baseModel() {
  return gateway(AI_MODEL)
}

/** Lazily-built Polar ingestion strategy (only when billing is configured). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let strategy: any = null
function getStrategy() {
  if (!polarToken) return null
  if (!strategy) {
    strategy = Ingestion({ accessToken: polarToken, server: polarServer })
      // The LLM strategy wraps an AI SDK v2 model; the gateway model is
      // compatible at runtime but the published types differ by a version.
      .strategy(new LLMStrategy(baseModel() as never))
      // Emit one "ai_tokens" event per generation. The metadata carries
      // inputTokens/outputTokens/totalTokens, which the Polar meter aggregates
      // into the org's credit balance.
      .ingest(AI_METER)
  }
  return strategy
}

/**
 * Build the language model to pass to generateText/streamText. When Polar is
 * configured, returns a metered client bound to the org's external id;
 * otherwise returns the raw gateway model (usage simply isn't metered).
 */
export function meteredModel(orgId: string): LanguageModel {
  const s = getStrategy()
  if (!s) return baseModel() as unknown as LanguageModel
  return s.client({ externalCustomerId: orgId }) as unknown as LanguageModel
}
