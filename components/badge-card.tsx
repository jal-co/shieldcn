"use client"

import { useState } from "react"
import { BadgeModal } from "@/components/badge-modal"

export interface ShowcaseBadge {
  title: string
  subtitle: string
  badgePath: string
  description?: string
  docsHref?: string
}

interface BadgeCardProps {
  badge: ShowcaseBadge
}

export function BadgeCard({ badge }: BadgeCardProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="group relative flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-left transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 active:scale-[0.98]"
        aria-label={`${badge.title} badge`}
      >
        <div className="flex w-full justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={badge.badgePath}
            alt={badge.title}
            className="inline-block h-8 max-w-full"
            loading="lazy"
          />
        </div>

        <div className="w-full text-center">
          <p className="truncate px-1 text-xs font-medium">{badge.title}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            {badge.subtitle}
          </p>
        </div>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-background/95 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
          <span className="text-xs font-semibold text-primary">Use this badge</span>
          <span className="text-[10px] text-muted-foreground">Click to copy</span>
        </div>
      </button>

      <BadgeModal
        title={badge.title}
        subtitle={badge.subtitle}
        badgePath={badge.badgePath}
        description={badge.description}
        docsHref={badge.docsHref}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
