import type { Metadata } from "next"
import { Suspense } from "react"
import { SiteShell } from "@/components/site-shell"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Reset password",
  description: "Choose a new password for your shieldcn account.",
  path: "/reset-password",
})

export default function ResetPasswordPage() {
  return (
    <SiteShell>
      <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-20">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </SiteShell>
  )
}
