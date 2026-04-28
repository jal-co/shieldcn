import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { SiteShell } from "@/components/site-shell"
import ProfileGeneratorClient from "./profile-client"
import {
  ProfileTourProvider,
  ProfileTourReplayButton,
} from "./profile-tour"
import { pageMetadata } from "@/lib/metadata"
import { profileReadmeJsonLd } from "@/lib/json-ld"

export const metadata: Metadata = pageMetadata({
  title: "GitHub Profile README Badge Generator",
  description:
    "Generate beautiful badges for your GitHub profile README. Auto-detects your skills, languages, social links, and top repos. Styled as shadcn/ui buttons with 6 variants, 16 themes, and 40,000+ icons.",
  path: "/gen/profile",
  ogTitle:
    "GitHub Profile README Badge Generator — shieldcn",
})

export default function ProfileGeneratorPage() {
  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(profileReadmeJsonLd()),
        }}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-4xl px-6 py-12 md:px-10">
          <ProfileTourProvider>
            <header className="mb-10 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <div className="mb-2">
                  <Link
                    href="/gen"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="size-3" />
                    Repository Generator
                  </Link>
                </div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Profile README Generator
                </h1>
                <p className="text-sm text-muted-foreground">
                  Auto-generate{" "}
                  <a
                    href="https://shieldcn.dev"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    shieldcn
                  </a>{" "}
                  badges for your GitHub profile README.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ProfileTourReplayButton />
              </div>
            </header>

            <Suspense>
              <ProfileGeneratorClient />
            </Suspense>
          </ProfileTourProvider>
        </div>
      </main>
    </SiteShell>
  )
}
