/**
 * shieldcn
 * components/animated-header
 *
 * The site navbar. Animates in on mount (staged entrance) and reacts to page
 * scroll (condenses height, deepens the backdrop, reveals a border).
 *
 * Built with the Storyboard Animation pattern: a single `stage` integer drives
 * the entrance, a `scrolled` boolean drives the scroll state, every timing +
 * motion value is a named constant. The async GitHub button is passed in as a
 * slot (it's a server component and can't live in this client tree).
 *
 * The BAR / LOGO / NAV / ACTIONS values were tuned and baked in as static
 * literals.
 */

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 * Read top-to-bottom. Entrance values are ms after mount.
 *
 *    0ms   hidden (bar slid up off-screen, content faded)
 *  120ms   bar drops down into place (spring)
 *  320ms   logo fades + slides in from the left
 *  420ms   nav links stagger in (NAV.stagger apart)
 *  560ms   right-side actions fade in
 *
 *  scroll  scrollY crosses BAR.threshold →
 *            height   BAR.topHeight     → BAR.condensedHeight
 *            backdrop BAR.topBlur/op    → BAR.condensedBlur/op
 *            border   transparent       → visible
 *            logo     scale 1           → BAR.condensedLogoScale
 * ───────────────────────────────────────────────────────── */

"use client"

import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { motion, useScroll, useMotionValueEvent, useReducedMotion, type Transition } from "motion/react"
import { Button } from "@/components/ui/button"
import { SponsorButton } from "@/components/sponsor-button"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { MobileNav } from "@/components/mobile-nav"
import { ShieldcnLogo } from "@/components/shieldcn-logo"

// ---------------------------------------------------------------------------
// TIMING — entrance stage delays (ms after mount). Single source of truth.
// ---------------------------------------------------------------------------

const TIMING = {
  barDrop: 120, //   bar springs down into place
  logo: 320, //      logo slides in
  nav: 420, //       nav links begin staggering
  actions: 560, //   right-side actions fade in
}

// ---------------------------------------------------------------------------
// BAR — the header bar itself: entrance drop + scroll-driven condense.
// ---------------------------------------------------------------------------

const BAR = {
  dropFrom: -64, //          px the bar slides down from on entrance
  spring: { type: "spring" as const, stiffness: 240, damping: 26, mass: 1 },

  threshold: 24, //          px scrolled before condensing
  topHeight: 64, //          px bar height at the top of the page
  condensedHeight: 52, //    px bar height once scrolled
  topBlur: 4, //             px backdrop blur at top
  condensedBlur: 12, //      px backdrop blur once scrolled
  topBgOpacity: 0.6, //      background alpha at top (0–1)
  condensedBgOpacity: 0.85, // background alpha once scrolled
  condensedLogoScale: 0.92, // logo scale once scrolled
  stateSpring: { type: "spring" as const, stiffness: 300, damping: 30 },
}

// ---------------------------------------------------------------------------
// LOGO — entrance offset for the brand mark.
// ---------------------------------------------------------------------------

const LOGO = {
  offsetX: -12, //   px the logo slides in from
  spring: { type: "spring" as const, visualDuration: 0.5, bounce: 0.25 },
}

// ---------------------------------------------------------------------------
// NAV — primary links, staggered in. Items rendered with .map().
// ---------------------------------------------------------------------------

type NavLink = { href: string; label: string }
type NavItem = NavLink | { label: string; children: NavLink[] }

const NAV = {
  offsetY: -8, //    px each link drops in from
  stagger: 0.06, //  seconds between each link
  spring: { type: "spring" as const, visualDuration: 0.4, bounce: 0.3 },
  items: [
    { href: "/docs", label: "Docs" },
    { href: "/studio", label: "Studio" },
    { href: "/showcase", label: "Showcase" },
    {
      label: "Generator",
      children: [
        { href: "/gen", label: "All badges" },
        { href: "/header", label: "Headers" },
        { href: "/sponsors", label: "Sponsors" },
        { href: "/contributors", label: "Contributors" },
      ],
    },
  ] as NavItem[],
}

// ---------------------------------------------------------------------------
// NavDropdown — a hover/click menu for a nav item with children. Lightweight
// (no Radix dependency) so it slots cleanly into the staggered motion items.
// ---------------------------------------------------------------------------

function NavDropdown({ label, items }: { label: string; items: NavLink[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Button
        variant="ghost"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <ChevronDown
          className={`ml-0.5 size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </Button>
      {open && (
        // Positioned wrapper sits flush against the trigger (top-full) and uses
        // top *padding* — not margin — as a hover-safe bridge: the visual gap is
        // still part of the hoverable element, so the cursor can travel from the
        // button to the menu without leaving the dropdown and closing it.
        <div className="absolute left-0 top-full z-40 min-w-[180px] pt-1.5">
          <div
            role="menu"
            className="rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none"
              >
                {it.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ACTIONS — right-side cluster entrance.
// ---------------------------------------------------------------------------

const ACTIONS = {
  offsetX: 12, //    px the cluster slides in from
  spring: { type: "spring" as const, visualDuration: 0.45, bounce: 0.2 },
}

export function AnimatedHeader({ githubButton }: { githubButton: ReactNode }) {
  // Scroll-state values (tuned, baked-in literals).
  const t = BAR
  const reduce = useReducedMotion()

  // Entrance — single integer stage drives the staged reveal.
  // 1: bar  2: logo  3: nav  4: actions
  // Reduced motion: skip straight to the final stage — no staggered drop-in.
  const [stage, setStage] = useState(reduce ? 4 : 0)

  useEffect(() => {
    if (reduce) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStage(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setStage(s => Math.max(s, 1)), TIMING.barDrop))
    timers.push(setTimeout(() => setStage(s => Math.max(s, 2)), TIMING.logo))
    timers.push(setTimeout(() => setStage(s => Math.max(s, 3)), TIMING.nav))
    timers.push(setTimeout(() => setStage(s => Math.max(s, 4)), TIMING.actions))
    return () => timers.forEach(clearTimeout)
  }, [reduce])

  // Scroll — condense the bar once past the threshold.
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(scrollY, "change", v => setScrolled(v > t.threshold))

  const height = scrolled ? t.condensedHeight : t.topHeight
  const blur = scrolled ? t.condensedBlur : t.topBlur
  const bgOpacity = scrolled ? t.condensedBgOpacity : t.topBgOpacity
  const logoScale = scrolled ? t.condensedLogoScale : 1

  return (
    <motion.header
      className="sticky top-0 z-30 flex items-center gap-2 border-b px-4 sm:px-6"
      style={{
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        backgroundColor: `color-mix(in oklab, var(--background) ${Math.round(bgOpacity * 100)}%, transparent)`,
        borderColor: scrolled ? "var(--border)" : "transparent",
        transition: "background-color 200ms ease, backdrop-filter 200ms ease, border-color 200ms ease",
      }}
      initial={reduce ? { opacity: 1, y: 0, height: BAR.topHeight } : { y: BAR.dropFrom, opacity: 0, height: BAR.topHeight }}
      animate={reduce ? { opacity: 1, y: 0, height } : {
        y: stage >= 1 ? 0 : BAR.dropFrom,
        opacity: stage >= 1 ? 1 : 0,
        height,
      }}
      transition={reduce
        ? { duration: 0 }
        : { y: BAR.spring as Transition, opacity: { duration: 0.3 }, height: BAR.stateSpring as Transition }}
    >
      <MobileNav />

      {/* Logo */}
      <motion.div
        initial={reduce ? { opacity: 1, x: 0 } : { opacity: 0, x: LOGO.offsetX }}
        animate={reduce ? { opacity: 1, x: 0 } : { opacity: stage >= 2 ? 1 : 0, x: stage >= 2 ? 0 : LOGO.offsetX }}
        transition={reduce ? { duration: 0 } : (LOGO.spring as Transition)}
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <motion.span animate={{ scale: logoScale }} transition={reduce ? { duration: 0 } : (BAR.stateSpring as Transition)}>
            <ShieldcnLogo className="h-9 w-auto" />
          </motion.span>
          <span className="hidden font-heading sm:inline">shieldcn</span>
        </Link>
      </motion.div>

      {/* Primary nav — staggered */}
      <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
        {NAV.items.map((item, i) => (
          <motion.div
            key={"children" in item ? item.label : item.href}
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: NAV.offsetY }}
            animate={reduce ? { opacity: 1, y: 0 } : { opacity: stage >= 3 ? 1 : 0, y: stage >= 3 ? 0 : NAV.offsetY }}
            transition={reduce ? { duration: 0 } : { ...(NAV.spring as Transition), delay: stage >= 3 ? i * NAV.stagger : 0 }}
          >
            {"children" in item ? (
              <NavDropdown label={item.label} items={item.children} />
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link href={item.href}>{item.label}</Link>
              </Button>
            )}
          </motion.div>
        ))}
      </nav>

      {/* Right-side actions */}
      <motion.div
        className="ml-auto flex items-center gap-1.5"
        initial={reduce ? { opacity: 1, x: 0 } : { opacity: 0, x: ACTIONS.offsetX }}
        animate={reduce ? { opacity: 1, x: 0 } : { opacity: stage >= 4 ? 1 : 0, x: stage >= 4 ? 0 : ACTIONS.offsetX }}
        transition={reduce ? { duration: 0 } : (ACTIONS.spring as Transition)}
      >
        <SponsorButton className="hidden sm:inline-flex" />
        {githubButton}
        <ThemeSwitcher />
      </motion.div>
    </motion.header>
  )
}
