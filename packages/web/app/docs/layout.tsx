import type { ReactNode } from "react"
import { SiteFooter } from "@/components/footer"
import { Sidebar } from "@/components/sidebar"
import { SiteShell } from "@/components/site-shell"

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <SiteShell footer={false}>
      <aside className="hidden w-72 shrink-0 border-r bg-sidebar/40 md:block">
        <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
          <Sidebar />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {children}
        <SiteFooter />
      </main>
    </SiteShell>
  )
}
