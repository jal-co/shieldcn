import { SiteShell } from "@/components/site-shell"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl px-6 py-14 md:px-10">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-16 w-full" />
          </div>

          <div className="mt-12 flex flex-col gap-8">
            <Skeleton className="h-6 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>

          <Skeleton className="mt-12 h-40 w-full rounded-lg" />
        </div>
      </main>
    </SiteShell>
  )
}
