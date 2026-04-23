"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const docsNav: NavGroup[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "API Reference", href: "/docs/api-reference" },
      { title: "Token Pool", href: "/token-pool" },
      { title: "Sponsor", href: "/sponsor" },
    ],
  },
  {
    title: "Badges",
    items: [
      { title: "Static Badge", href: "/docs/badges/static" },
      { title: "Dynamic JSON", href: "/docs/badges/dynamic-json" },
      { title: "HTTPS Endpoint", href: "/docs/badges/https-endpoint" },
      { title: "npm", href: "/docs/badges/npm" },
      { title: "GitHub", href: "/docs/badges/github" },
      { title: "Discord", href: "/docs/badges/discord" },
    ],
  },
  {
    title: "Customization",
    items: [
      { title: "Themes", href: "/docs/customization/themes" },
      { title: "Styles", href: "/docs/customization/styles" },
    ],
  },
]

export { docsNav }

export function Sidebar() {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = React.useState(false)

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function check() {
      if (!el) return
      setCanScroll(el.scrollHeight > el.clientHeight + 2)
    }
    check()
    el.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", check)
      ro.disconnect()
    }
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      if (!el) return
      const nearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 16
      setCanScroll(!nearBottom && el.scrollHeight > el.clientHeight + 2)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto p-4 pb-14 no-scrollbar"
      >
        <nav className="flex flex-col gap-1">
          {docsNav.map((group, i) => (
            <div key={group.title} className="flex flex-col gap-0.5">
              <p className={cn(
                "px-2 pb-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                i === 0 ? "pt-0" : "pt-3"
              )}>
                {group.title}
              </p>
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      isActive
                        ? "font-medium text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-md bg-accent"
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : {
                                type: "spring",
                                stiffness: 500,
                                damping: 35,
                              }
                        }
                      />
                    )}
                    <span className="relative z-10">{item.title}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </div>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 flex flex-col items-center transition-opacity duration-200",
          canScroll ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="h-8 w-full bg-gradient-to-t from-background to-transparent" />
        <button
          type="button"
          aria-label="Scroll down for more"
          onClick={() =>
            scrollRef.current?.scrollBy({ top: 120, behavior: "smooth" })
          }
          className="flex w-full cursor-pointer flex-col items-center gap-0.5 bg-background pb-3 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            More
          </span>
          <ChevronDown className="size-3 motion-safe:animate-pulse text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
