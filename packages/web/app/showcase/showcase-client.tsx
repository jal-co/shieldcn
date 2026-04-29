"use client"

import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { BadgeCard } from "@/components/badge-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ShowcaseSubmitDialog } from "@/components/showcase-submit-dialog"
import { featuredBadges, categories } from "@/lib/showcase-data"

const ALL_CATEGORY_NAMES = ["All", ...categories.map((c) => c.name)]
const totalIconCount = categories.reduce((sum, c) => sum + c.icons.length, 0)

export default function ShowcasePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")

  const activeCategoryData = categories.find((c) => c.name === activeCategory)

  const filteredIcons = useMemo(() => {
    const icons = activeCategory === "All"
      ? Array.from(
          new Map(categories.flatMap((c) => c.icons).map((icon) => [icon.badgePath, icon])).values()
        )
      : activeCategoryData?.icons ?? []

    if (!searchQuery.trim()) return icons

    const q = searchQuery.toLowerCase()
    return icons.filter((icon) =>
      [icon.title, icon.subtitle, icon.description ?? ""].some((value) =>
        value.toLowerCase().includes(q)
      )
    )
  }, [activeCategory, activeCategoryData, searchQuery])

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-14 md:px-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Badge Showcase</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            A curated set of shieldcn badge examples designed to look good in real-world README rows,
            docs pages, package pages, and community sections. Click any card to tweak it and copy the exact output.
          </p>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {totalIconCount}+ curated examples · focused on useful, polished badge patterns
            </p>
            <ShowcaseSubmitDialog />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Featured examples</h2>
            <span className="text-xs text-muted-foreground">starter row ideas</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {featuredBadges.map((badge) => (
              <BadgeCard key={`featured-${badge.badgePath}-${badge.title}`} badge={badge} />
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search badges by name, provider, or use case…"
            className="h-10 pl-9 pr-9"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORY_NAMES.map((cat) => {
            const count = cat === "All"
              ? totalIconCount
              : categories.find((c) => c.name === cat)?.icons.length ?? 0
            const isActive = activeCategory === cat

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                <span>{cat}</span>
                <Badge
                  variant={isActive ? "outline" : "secondary"}
                  className={isActive
                    ? "h-4 min-w-[18px] justify-center border-primary-foreground/20 bg-primary-foreground/10 px-1 text-[10px] text-primary-foreground"
                    : "h-4 min-w-[18px] justify-center px-1 text-[10px]"
                  }
                >
                  {count}
                </Badge>
              </button>
            )
          })}
        </div>

        {activeCategory !== "All" && activeCategoryData ? (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <p className="text-sm font-medium">{activeCategoryData.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{activeCategoryData.description}</p>
          </div>
        ) : null}

        {filteredIcons.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="text-4xl opacity-30">🔍</div>
            <div>
              <p className="text-sm font-medium">No badges found</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a different search or switch category.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setActiveCategory("All")
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredIcons.map((badge) => (
              <BadgeCard key={`${activeCategory}-${badge.badgePath}-${badge.title}`} badge={badge} />
            ))}
          </div>
        )}

        {filteredIcons.length > 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            {filteredIcons.length} badge{filteredIcons.length === 1 ? "" : "s"}
            {searchQuery ? ` matching "${searchQuery}"` : ""}
            {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
          </p>
        ) : null}
      </div>
    </main>
  )
}
