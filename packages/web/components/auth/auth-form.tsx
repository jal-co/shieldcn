"use client"

/**
 * shieldcn
 * components/auth/auth-form.tsx
 *
 * Sign-in / sign-up form built from shadcn primitives, calling the Better Auth
 * client directly (no third-party auth UI). The GitHub social button redirects
 * through the same-origin /api/auth handler; email/password resolves inline and
 * pushes to the callback URL on success.
 *
 * Two auth-plugin integrations live here:
 *  - lastLoginMethod: a "Last used" badge on the method (github / email) the
 *    returning user signed in with last (read from a cookie via authClient).
 *  - captcha (Turnstile): when configured, the solved token is sent on the
 *    protected requests via the `x-captcha-response` header. Without a site key
 *    the widget renders nothing and the header is simply omitted.
 *
 * Rendered both as a full page (/sign-in, /sign-up) and inside a modal
 * (AuthModal) — the layout is self-contained so it works in either shell.
 */

import { useRef, useState, useSyncExternalStore } from "react"
import type { TurnstileInstance } from "@marsidev/react-turnstile"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GitHubMark } from "@/components/auth/provider-marks"
import { TurnstileWidget, turnstileEnabled } from "@/components/auth/turnstile-widget"
import { cn } from "@/lib/utils"

type Mode = "sign-in" | "sign-up"

/** Small "Last used" pill shown next to the method the user signed in with last. */
function LastUsedBadge() {
  return (
    <span className="ml-auto rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      Last used
    </span>
  )
}

export function AuthForm({
  mode,
  callbackURL = "/dashboard",
  onSuccess,
  className,
}: {
  mode: Mode
  callbackURL?: string
  /** Called after a successful email sign-in/up (e.g. to close a modal). */
  onSuccess?: () => void
  className?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetOk = searchParams.get("reset") === "success"
  const isSignUp = mode === "sign-up"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [social, setSocial] = useState<"github" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined)

  /** Clear the token and reset the widget so it issues a fresh, usable one. */
  function resetCaptcha() {
    setCaptchaToken(null)
    turnstileRef.current?.reset()
  }

  // Last-used method is cookie-backed and client-only. useSyncExternalStore
  // reads it after hydration (server snapshot is null) with no effect churn.
  const lastMethod = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return authClient.getLastUsedLoginMethod?.() ?? null
      } catch {
        return null
      }
    },
    () => null,
  )

  /** Attach the Turnstile token to protected requests when configured. */
  function fetchOptions() {
    if (!turnstileEnabled || !captchaToken) return undefined
    return { headers: { "x-captcha-response": captchaToken } }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (turnstileEnabled && !captchaToken) {
      setError("Please complete the challenge below.")
      return
    }
    setPending(true)
    try {
      const opts = fetchOptions()
      const res = isSignUp
        ? await authClient.signUp.email({ name, email, password, callbackURL, fetchOptions: opts })
        : await authClient.signIn.email({ email, password, callbackURL, fetchOptions: opts })
      if (res.error) {
        setError(res.error.message ?? "Something went wrong")
        resetCaptcha() // token is single-use — re-challenge so retry works
        return
      }
      onSuccess?.()
      router.push(callbackURL)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      resetCaptcha()
    } finally {
      setPending(false)
    }
  }

  async function onSocial(provider: "github") {
    setError(null)
    setSocial(provider)
    try {
      await authClient.signIn.social({ provider, callbackURL })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setSocial(null)
    }
  }

  const busy = pending || social !== null

  return (
    <div className={cn("w-full max-w-sm", className)}>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp
              ? "Start saving READMEs, badges, and brands."
              : "Sign in to your shieldcn workspace."}
          </p>
        </div>

        {resetOk && !isSignUp && (
          <p className="mb-4 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
            Password reset — sign in with your new password.
          </p>
        )}

        {/* Social */}
        <Button
          type="button"
          variant={lastMethod === "github" ? "default" : "outline"}
          className="w-full"
          disabled={busy}
          onClick={() => onSocial("github")}
        >
          {social === "github" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GitHubMark className="size-4" />
          )}
          Continue with GitHub
          {lastMethod === "github" && <LastUsedBadge />}
        </Button>

        {/* Divider */}
        <div className="relative py-4 text-center">
          <span className="relative z-10 bg-card px-2 text-xs text-muted-foreground">
            or continue with email
          </span>
          <span className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
        </div>

        {/* Email / password */}
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {!isSignUp && (
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              minLength={8}
            />
          </div>

          {/* Turnstile challenge (renders only when configured) */}
          {turnstileEnabled && (
            <div className="flex justify-center">
              <TurnstileWidget widgetRef={turnstileRef} onToken={setCaptchaToken} />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="relative w-full" disabled={busy}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isSignUp ? "Create account" : "Sign in"}
            {lastMethod === "email" && <LastUsedBadge />}
          </Button>
        </form>

        {/* Toggle */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Link href="/sign-in" className="text-foreground underline underline-offset-4">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to shieldcn?{" "}
              <Link href="/sign-up" className="text-foreground underline underline-offset-4">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Legal footnote */}
      <p className="mt-4 px-6 text-center text-xs text-muted-foreground">
        By continuing, you agree to our{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
