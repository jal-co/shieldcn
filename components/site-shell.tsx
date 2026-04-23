import type { ReactNode } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/footer"

/**
 * Shared site shell — dot grid background, max-width container,
 * header, and footer. Used by both the landing page and docs layout.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Dot grid background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: [
            "linear-gradient(to right, color-mix(in oklab, var(--color-muted-foreground) 10%, transparent) 1px, transparent 1px)",
            "linear-gradient(to bottom, color-mix(in oklab, var(--color-muted-foreground) 10%, transparent) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "28px 28px",
          maskImage:
            "linear-gradient(to right, black, transparent 30%, transparent 70%, black)",
          WebkitMaskImage:
            "linear-gradient(to right, black, transparent 30%, transparent 70%, black)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col border-x border-dashed border-border bg-background">
        <SiteHeader />
        <div className="flex flex-1">{children}</div>
        <SiteFooter />
      </div>
    </div>
  )
}
