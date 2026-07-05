import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ShieldX, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteShell } from "@/components/site-shell"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"
import { query } from "@shieldcn/core/db"
import { grantPlan } from "@shieldcn/core/entitlements"
import { claimBrandForOwner } from "@shieldcn/core/brands"
import {
  getBrandClaim,
  markClaimClaimed,
  isClaimOpen,
} from "@shieldcn/core/brand-claims"

export const dynamic = "force-dynamic"

export const metadata: Metadata = pageMetadata({
  title: "Claim your brand",
  description: "Claim your brand on shieldcn — set up a Plus account and your managed brand.",
  path: "/claim",
})

type Params = { params: Promise<{ token: string }> }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-20 text-center md:px-10">
          {children}
        </div>
      </main>
    </SiteShell>
  )
}

export default async function ClaimPage({ params }: Params) {
  const { token } = await params
  const claim = await getBrandClaim(token)

  // Invalid / already-claimed / expired.
  if (!isClaimOpen(claim)) {
    const already = claim?.claimedBy
    return (
      <Shell>
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
          <ShieldX className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {already ? "This invite was already claimed" : "This invite isn't valid"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {already
            ? "The brand tied to this link has already been claimed. If that was you, it's in your dashboard."
            : "This claim link is invalid or has expired. Ask whoever sent it for a fresh one."}
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline"><Link href="/dashboard">Go to dashboard</Link></Button>
        </div>
      </Shell>
    )
  }

  const brand = claim! // isClaimOpen guarantees non-null
  const session = await getSession()

  // Signed out: send them to sign-up, returning here to complete the claim.
  if (!session) {
    return (
      <Shell>
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border bg-card text-primary">
          <Sparkles className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Claim {brand.brandName ?? brand.brandSlug} on shieldcn
        </h1>
        <p className="text-sm text-muted-foreground">
          You&apos;ve been invited to claim a managed brand. Create your account (or sign in)
          and we&apos;ll set you up with a <strong>Plus</strong> plan and hand you the{" "}
          <code className="font-mono">?brand={brand.brandSlug}</code> brand to edit.
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild>
            <Link href={`/sign-up?next=${encodeURIComponent(`/claim/${token}`)}`}>Create account & claim</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/sign-in?next=${encodeURIComponent(`/claim/${token}`)}`}>Sign in</Link>
          </Button>
        </div>
      </Shell>
    )
  }

  // Signed in: complete the claim atomically, then provision Plus + the brand.
  const ownerId = session.orgId ?? session.userId
  const claimed = await markClaimClaimed(token, ownerId)
  if (!claimed) {
    // Lost the race (claimed a moment ago) — treat as already claimed.
    redirect("/dashboard")
  }

  await grantPlan(query, ownerId, "plus", { reason: `brand-claim:${brand.brandSlug}` })
  await claimBrandForOwner(brand.brandSlug, ownerId, {
    name: brand.brandName,
    config: brand.config,
  })

  // Land them on the brand editor to finish setup.
  redirect(`/dashboard/brands/${brand.brandSlug}`)
}
