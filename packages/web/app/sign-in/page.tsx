import type { Metadata } from "next"
import { SiteShell } from "@/components/site-shell"
import { AuthForm } from "@/components/auth/auth-form"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Sign in",
  description: "Sign in to your shieldcn workspace.",
  path: "/sign-in",
})

export default function SignInPage() {
  return (
    <SiteShell>
      <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-20">
        <AuthForm mode="sign-in" />
      </main>
    </SiteShell>
  )
}
