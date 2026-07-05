/**
 * shieldcn
 * app/dashboard/layout.tsx
 *
 * The dashboard shell (shadcn dashboard-01 composition): an inset AppSidebar
 * plus a SiteHeader (DashboardTopbar) inside SidebarInset. All /dashboard/*
 * routes render inside the inset content area, which is an `@container/main`
 * so pages reflow to the inset width, not the viewport.
 */

import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getSession } from "@/lib/auth"
import { isAdminSession } from "@/lib/admin"

// Every dashboard route reads the session cookie (getSession), so the whole
// subtree is dynamic — declare it up front instead of letting Next discover it
// per-page during the static-generation probe.
export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Admin-only surface: an unauthenticated or non-admin visitor is bounced to
  // the (unlinked) admin sign-in.
  const session = await getSession()
  if (!session || !isAdminSession(session)) redirect("/brandmgmt")

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "3.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <DashboardTopbar />
        <div className="@container/main flex min-w-0 flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
