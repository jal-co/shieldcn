import { SiteShell } from "@/components/site-shell"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <section className="px-6 py-10 md:px-10 md:py-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-12 w-full max-w-md" />
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="h-px w-full bg-border" />

          <section className="py-16">
            <div className="mb-8 flex max-w-lg flex-col gap-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
