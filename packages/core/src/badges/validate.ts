/**
 * shieldcn
 * lib/badges/validate
 *
 * Validates an incoming badge request against the registry (the source of truth).
 *
 * Design goals:
 *   - Fail loudly, not silently. An unsupported variant on a badge that doesn't
 *     support it should be visible, not quietly rendered.
 *   - Incremental & non-breaking. Only providers present in the registry are
 *     validated. Unknown providers return `ok` so the legacy switch keeps working
 *     untouched while we roll the registry out provider-by-provider.
 */

import type { BadgeStyle } from "./types"
import { ALL_VARIANTS, allowedVariants, isRegistered, resolveTopic } from "./registry"

export interface ValidationResult {
  /** True when the request is valid (or the provider isn't modeled yet). */
  ok: boolean
  /** Machine-readable failure code. */
  code?: "unsupported-variant"
  /** Human-readable message, suitable for an error badge value. */
  message?: string
}

const VARIANT_SET = new Set<string>(ALL_VARIANTS)

/**
 * Validate a parsed badge request.
 *
 * @param provider  first URL segment (e.g. "npm")
 * @param rest      segments AFTER the provider
 * @param variant   the requested variant (style), already lowercased
 */
export function validateBadgeRequest(
  provider: string,
  rest: string[],
  variant: string | undefined
): ValidationResult {
  // Not modeled yet → defer to legacy behavior. Non-breaking by design.
  if (!isRegistered(provider)) return { ok: true }

  // Unknown topic → defer. We can't determine a variant policy, and the data
  // layer (fetchBadgeData) already returns a graceful "not found" badge for
  // genuinely unknown topics. Erroring here would risk breaking a real badge
  // if the registry's topic list is ever incomplete — so we stay non-breaking.
  const topic = resolveTopic(provider, rest)
  if (!topic) return { ok: true }

  // No variant requested → default is always valid.
  if (!variant) return { ok: true }

  // An entirely unknown variant string.
  if (!VARIANT_SET.has(variant)) {
    return {
      ok: false,
      code: "unsupported-variant",
      message: `unknown variant "${variant}"`,
    }
  }

  // A real variant, but not allowed for this specific badge.
  const allowed = allowedVariants(topic)
  if (!allowed.includes(variant as BadgeStyle)) {
    return {
      ok: false,
      code: "unsupported-variant",
      message: `variant "${variant}" not supported for ${provider}/${topic.topic}`,
    }
  }

  return { ok: true }
}

/**
 * Resolve the EFFECTIVE variant for a request — the requested one if valid,
 * otherwise "default". This is non-breaking by design:
 *   - Unknown variant strings (e.g. legacy `flat`, `subtle`, typos) coerce to
 *     "default", which is exactly how they rendered before (they fell through
 *     the renderer's switch to the default case).
 *   - A real variant that a specific badge doesn't support (e.g. `branded` on
 *     a CI status badge) coerces to "default" instead of erroring.
 * No previously-rendering URL ever becomes a broken/error image.
 */
export function resolveVariant(
  provider: string,
  rest: string[],
  requested: string | undefined,
): BadgeStyle {
  const variant = (requested || "default").toLowerCase()
  if (variant === "default") return "default"
  return validateBadgeRequest(provider, rest, variant).ok
    ? (variant as BadgeStyle)
    : "default"
}
