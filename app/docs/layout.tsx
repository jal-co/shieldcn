import type { ReactNode } from "react"
import { Sidebar } from "@/components/sidebar"
import { SiteShell } from "@/components/site-shell"

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <SiteShell>
      <aside className="hidden w-64 shrink-0 border-r md:block">
        <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
          <Sidebar />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {children}
      </main>
    </SiteShell>
  )
}
