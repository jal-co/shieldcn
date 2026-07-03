/**
 * shieldcn
 * lib/ai.ts
 *
 * AI model factory for the Studio's Plus features. The model is wrapped with
 * Polar's LLM ingestion strategy so token usage is metered per organization
 * (the external customer id) — Polar owns the credit balance and overage, not
 * a homegrown counter.
 *
 * Provider is chosen by AI_MODEL ("anthropic/..." or "openai/...") so the same
 * code runs against whichever provider has a key configured.
 */

import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"
import { Ingestion } from "@polar-sh/ingestion"
import { LLMStrategy } from "@polar-sh/ingestion/strategies/LLM"

const AI_MODEL = process.env.AI_MODEL ?? "anthropic/claude-3-5-sonnet-latest"
const polarToken = process.env.POLAR_ACCESS_TOKEN
const polarServer = (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox"

export const aiConfigured = Boolean(
  process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
)

/** Resolve the raw provider model from the AI_MODEL env string. */
function baseModel() {
  const [provider, ...rest] = AI_MODEL.split("/")
  const id = rest.join("/")
  if (provider === "openai") return openai(id)
  return anthropic(id || "claude-3-5-sonnet-latest")
}

/** Lazily-built Polar ingestion strategy (only when billing is configured). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let strategy: any = null
function getStrategy() {
  if (!polarToken) return null
  if (!strategy) {
    strategy = Ingestion({ accessToken: polarToken, server: polarServer }).strategy(
      // The LLM strategy wraps an AI SDK v2 model; ai's LanguageModel is
      // compatible at runtime but the published types differ by a version.
      new LLMStrategy(baseModel() as never),
    )
  }
  return strategy
}

/**
 * Build the language model to pass to generateText/streamText. When Polar is
 * configured, returns a metered client bound to the org's external id;
 * otherwise returns the raw model (usage simply isn't metered).
 */
export function meteredModel(orgId: string): LanguageModel {
  const s = getStrategy()
  if (!s) return baseModel() as unknown as LanguageModel
  return s.client({ externalCustomerId: orgId }) as unknown as LanguageModel
}
