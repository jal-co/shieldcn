"use client"

import { useState, useEffect } from "react"
import { BadgeGroupModal } from "@/components/badge-group-modal"
import { useBadgeMode } from "@/lib/use-badge-mode"
import { cn } from "@/lib/utils"
import type { GroupShowcaseItem } from "@/lib/showcase-data"
import { Copy } from "lucide-react"

interface GroupShowcaseProps {
  items: GroupShowcaseItem[]
}

export function GroupShowcase({ items }: GroupShowcaseProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <GroupCard key={item.badgePath} item={item} />
      ))}
    </div>
  )
}

function GroupCard({ item }: { item: GroupShowcaseItem }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { adaptUrl } = useBadgeMode()

  useEffect(() => { setMounted(true) }, [])

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-5 text-left transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 active:scale-[0.99]",
          item.span === 2 ? "sm:col-span-2" : "",
        )}
        aria-label={`${item.title} badge group`}
      >
        {/* Badge image */}
        <div className="flex w-full items-center justify-center overflow-x-auto py-1">
          {mounted ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={adaptUrl(item.badgePath)}
              alt={item.title}
              className="inline-block h-8 max-w-full"
              loading="lazy"
            />
          ) : (
            <div className="h-8" />
          )}
        </div>

        {/* Label */}
        <div className="w-full text-center">
          <p className="text-xs font-medium">{item.title}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{item.description}</p>
        </div>

        {/* Hover overlay */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-background/95 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
          <Copy className="size-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Customize group</span>
          <span className="text-[10px] text-muted-foreground">Click to edit &amp; copy</span>
        </div>
      </button>

      <BadgeGroupModal
        title={item.title}
        description={item.description}
        badgePath={item.badgePath}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
