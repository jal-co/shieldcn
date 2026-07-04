/**
 * shieldcn
 * lib/ai.ts
 *
 * AI for the Studio's Plus features. Models resolve through the Vercel AI
 * Gateway: a single AI_MODEL id (e.g. "openai/gpt-4o-mini") picks the provider
 * and the gateway handles keys/routing/observability. Auth is either
 * AI_GATEWAY_API_KEY or the Vercel OIDC token.
 *
 * Metering is decoupled from generation: we generate with the plain gateway
 * model, then record token usage against Polar as a best-effort, fire-and-forget
 * event. Wrapping the model in Polar's LLM strategy coupled billing into the hot
 * path and risked breaking generation on any SDK-version drift — so usage is now
 * metered after the fact via the same events API used elsewhere.
 */

import { gateway } from "ai"
import type { LanguageModel } from "ai"
import { meterEvent } from "@/lib/polar-meter"

// Default to a model the AI Gateway free tier allows so AI works out of the box;
// override with AI_MODEL (e.g. a premium model once the gateway has credits).
const AI_MODEL = process.env.AI_MODEL || "openai/gpt-4o-mini"
/** Polar meter name AI token usage is ingested under. */
const AI_METER = "ai_tokens"

/**
 * AI is usable when the gateway can authenticate — either an explicit gateway
 * key or a Vercel OIDC token (injected on Vercel, or via `vercel env pull`).
 */
export const aiConfigured = Boolean(
  process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
)

/** The gateway model to pass to generateText/streamText. */
export function aiModel(): LanguageModel {
  return gateway(AI_MODEL) as unknown as LanguageModel
}

/** Token usage shape returned by the AI SDK's generateText. */
export interface AiUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

/**
 * Record AI token usage against the owner's Polar balance. Best-effort and
 * fire-and-forget — metering must never fail or slow a generation.
 */
export function meterAiUsage(ownerId: string, usage: AiUsage | undefined): void {
  if (!usage) return
  void meterEvent(ownerId, AI_METER, {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
  })
}

/**
 * Classify a gateway/model error into a user-facing message + status. Gateway
 * "no access / not found / needs credits" errors are surfaced as a clean 503
 * rather than a raw 500, and out-of-credit errors as a 402 upsell.
 */
export function aiErrorResponse(err: unknown): { error: string; status: number } {
  const msg = err instanceof Error ? err.message : String(err)
  if (/free tier|do not have access|not found|upgrade to paid|no access/i.test(msg)) {
    return { error: "The AI model isn't available on this account yet.", status: 503 }
  }
  if (/credit|quota|balance|insufficient|402|403/i.test(msg)) {
    return { error: "Out of AI credits — upgrade or wait for the next cycle.", status: 402 }
  }
  return { error: "AI generation failed. Please try again.", status: 500 }
}
