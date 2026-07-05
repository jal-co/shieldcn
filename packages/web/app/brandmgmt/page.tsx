import type { Metadata } from "next"
import { Suspense } from "react"
import { SiteShell } from "@/components/site-shell"
import { AuthForm } from "@/components/auth/auth-form"

// Unlinked admin entry point — deliberately excluded from the sitemap and
// disallowed in robots.txt. No public sign-up; the admin account is created
// out-of-band (see DEV.md).
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

export default function BrandMgmtPage() {
  return (
    <SiteShell>
      <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-20">
        <Suspense fallback={null}>
          <AuthForm callbackURL="/dashboard" />
        </Suspense>
      </main>
    </SiteShell>
  )
}
