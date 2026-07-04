"use client"

/**
 * shieldcn
 * components/upgrade-cta.tsx
 *
 * Reusable upgrade prompts that steer viewers toward the paid Plus tier
 * ($10/mo). Two shapes:
 *
 *  - <UpgradeInline>  a compact banner for empty/locked panels
 *  - <UpgradeDialog>  a modal shown when a gated action is attempted
 *
 * Both link to the Polar checkout (/api/checkout?plan=…) for signed-in users,
 * and to /sign-in / /pricing otherwise.
 */

import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"
import type { Plan } from "@shieldcn/core/entitlements"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useMe } from "@/lib/use-me"

type Tier = Exclude<Plan, "free">

const TIER_META: Record<Tier, { name: string; price: string; icon: typeof Sparkles; blurb: string }> = {
  plus: {
    name: "Plus",
    price: "$10/mo",
    icon: Sparkles,
    blurb: "For maintainers who live in their READMEs — saved documents, AI, mass migration, and a managed brand.",
  },
}

/** Resolve the best CTA href given the viewer's auth state. */
function useCheckoutHref(tier: Tier): { href: string; label: string } {
  const { me } = useMe()
  if (!me.signedIn) return { href: "/sign-in?next=/pricing", label: `Sign in to get ${TIER_META[tier].name}` }
  if (!me.orgId) return { href: "/pricing", label: "Create an org to upgrade" }
  return { href: `/api/checkout?plan=${tier}`, label: `Upgrade to ${TIER_META[tier].name}` }
}

/**
 * Compact inline upgrade banner. Drop into a locked/empty panel.
 */
export function UpgradeInline({
  tier,
  feature,
  className,
}: {
  tier: Tier
  feature: string
  className?: string
}) {
  const meta = TIER_META[tier]
  const Icon = meta.icon
  const { href, label } = useCheckoutHref(tier)
  return (
    <div
      className={
        "flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between " +
        (className ?? "")
      }
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
          <Icon className="size-4" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">
            {feature} is a {meta.name} feature
          </p>
          <p className="text-xs text-muted-foreground">{meta.blurb}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild size="sm">
          <Link href={href}>
            {label} <span className="text-xs opacity-70">· {meta.price}</span>
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href="/pricing">Compare</Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * Modal upgrade prompt, shown when a viewer attempts a gated action. Control
 * `open` from the caller (e.g. after a 402 or a click on a locked control).
 */
export function UpgradeDialog({
  open,
  onOpenChange,
  tier,
  feature,
  description,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tier: Tier
  feature: string
  description?: string
}) {
  const meta = TIER_META[tier]
  const Icon = meta.icon
  const { href, label } = useCheckoutHref(tier)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
            <Icon className="size-5" />
          </div>
          <DialogTitle>Unlock {feature} with {meta.name}</DialogTitle>
          <DialogDescription>{description ?? meta.blurb}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-start">
          <Button asChild>
            <Link href={href}>
              {label} <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/pricing">See all plans</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
