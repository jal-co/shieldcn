"use client"

/**
 * shieldcn
 * components/auth/turnstile-widget.tsx
 *
 * Cloudflare Turnstile widget for auth forms. Renders the challenge and hands
 * the solved token back via onToken; on expiry/error it clears the token so the
 * form knows to re-challenge. No-ops (renders nothing, reports "configured:
 * false") when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset, so local dev and any
 * environment without Turnstile configured keep working without a challenge.
 *
 * The token is sent to Better Auth via the `x-captcha-response` header on the
 * protected requests (see auth-form.tsx). The server captcha plugin verifies it.
 */

import { useTheme } from "next-themes"
import { Turnstile } from "@marsidev/react-turnstile"

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

/** True when Turnstile is configured (a site key is present). */
export const turnstileEnabled = Boolean(SITE_KEY)

export function TurnstileWidget({
  onToken,
}: {
  /** Fired with the solved token, or null when it expires / errors. */
  onToken: (token: string | null) => void
}) {
  const { resolvedTheme } = useTheme()
  if (!SITE_KEY) return null

  return (
    <Turnstile
      siteKey={SITE_KEY}
      options={{
        theme: resolvedTheme === "light" ? "light" : "dark",
        size: "flexible",
      }}
      onSuccess={(token) => onToken(token)}
      onError={() => onToken(null)}
      onExpire={() => onToken(null)}
    />
  )
}
