"use client"

/**
 * shieldcn
 * components/auth/auth-form.tsx
 *
 * Sign-in / sign-up form built from shadcn primitives, calling the Better Auth
 * client directly (no third-party auth UI). The GitHub social button redirects
 * through the same-origin /api/auth handler; email/password resolves inline and
 * pushes to the callback URL on success.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GitHubMark } from "@/components/auth/provider-marks"

type Mode = "sign-in" | "sign-up"

export function AuthForm({
  mode,
  callbackURL = "/dashboard",
}: {
  mode: Mode
  callbackURL?: string
}) {
  const router = useRouter()
  const isSignUp = mode === "sign-up"
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [social, setSocial] = useState<"github" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const res = isSignUp
        ? await authClient.signUp.email({ name, email, password, callbackURL })
        : await authClient.signIn.email({ email, password, callbackURL })
      if (res.error) {
        setError(res.error.message ?? "Something went wrong")
        return
      }
      router.push(callbackURL)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{isSignUp ? "Create your account" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isSignUp
            ? "Start saving READMEs, badges, and brands."
            : "Sign in to your shieldcn workspace."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => onSocial("github")}
          >
            {social === "github" ? <Loader2 className="size-4 animate-spin" /> : <GitHubMark className="size-4" />}
            Continue with GitHub
          </Button>
        </div>

        <div className="relative py-1 text-center">
          <span className="relative z-10 bg-card px-2 text-xs text-muted-foreground">
            or
          </span>
          <span className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
        </div>

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        {isSignUp ? (
          <span>
            Already have an account?{" "}
            <Link href="/sign-in" className="underline underline-offset-4 hover:text-foreground">
              Sign in
            </Link>
          </span>
        ) : (
          <span>
            New to shieldcn?{" "}
            <Link href="/sign-up" className="underline underline-offset-4 hover:text-foreground">
              Create an account
            </Link>
          </span>
        )}
      </CardFooter>
    </Card>
  )
}
