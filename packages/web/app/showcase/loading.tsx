import { SiteShell } from "@/components/site-shell"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
          <div className="mb-8 flex flex-col gap-3">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
