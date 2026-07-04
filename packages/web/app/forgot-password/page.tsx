import type { Metadata } from "next"
import { SiteShell } from "@/components/site-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Forgot password",
  description: "Reset your shieldcn password.",
  path: "/forgot-password",
})

export default function ForgotPasswordPage() {
  return (
    <SiteShell>
      <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-20">
        <ForgotPasswordForm />
      </main>
    </SiteShell>
  )
}
