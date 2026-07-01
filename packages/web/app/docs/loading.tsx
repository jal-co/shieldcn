import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto grid w-full max-w-[90rem] grid-cols-1 gap-10 px-6 py-10 md:px-10 lg:py-14 xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-12 2xl:grid-cols-[minmax(0,52rem)_15rem] 2xl:justify-center">
      <div className="min-w-0">
        <div className="flex w-full max-w-[52rem] flex-col gap-8">
          <div className="flex flex-col gap-3 border-b border-border/60 pb-8">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
      <aside className="hidden xl:block">
        <div className="sticky top-24 flex flex-col gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      </aside>
    </div>
  )
}
