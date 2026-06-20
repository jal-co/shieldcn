import type { ReactNode } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/footer"

/**
 * Shared site shell — max-width container, header, and footer.
 * Used by both the landing page and docs layout.
 */
export function SiteShell({
  children,
  footer = true,
}: {
  children: ReactNode
  footer?: boolean
}) {
  return (
    <div className="relative min-h-screen">
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col bg-background">
        <SiteHeader />
        <div className="flex flex-1">{children}</div>
        {footer ? <SiteFooter /> : null}
      </div>
    </div>
  )
}
