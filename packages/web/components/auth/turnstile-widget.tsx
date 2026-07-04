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
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

/** True when Turnstile is configured (a site key is present). */
export const turnstileEnabled = Boolean(SITE_KEY)

export function TurnstileWidget({
  onToken,
  widgetRef,
}: {
  /** Fired with the solved token, or null when it expires / errors. */
  onToken: (token: string | null) => void
  /**
   * Ref to the widget instance so the form can reset() it after a failed
   * submit. Turnstile tokens are single-use — without a reset the widget won't
   * issue a new one and the user is stuck until it naturally expires.
   */
  widgetRef?: React.Ref<TurnstileInstance | undefined>
}) {
  const { resolvedTheme } = useTheme()
  if (!SITE_KEY) return null

  return (
    <Turnstile
      ref={widgetRef}
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
