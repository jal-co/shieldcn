import { SiteShell } from "@/components/site-shell"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-4xl px-6 py-12 md:px-10">
          <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="mb-8 h-16 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="mt-6 flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
