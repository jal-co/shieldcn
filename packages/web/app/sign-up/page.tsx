import type { Metadata } from "next"
import { Suspense } from "react"
import { SiteShell } from "@/components/site-shell"
import { AuthForm } from "@/components/auth/auth-form"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Sign up",
  description: "Create a shieldcn account to save READMEs, badges, and brands.",
  path: "/sign-up",
})

export default function SignUpPage() {
  return (
    <SiteShell>
      <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-20">
        <Suspense fallback={null}>
          <AuthForm mode="sign-up" callbackURL="/welcome" />
        </Suspense>
      </main>
    </SiteShell>
  )
}
