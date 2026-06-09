"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

export function ThemeSwitcher() {
  const { setTheme, resolvedTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  if (!mounted) {
    return <div className="size-8" />
  }

  return (
    <button
      type="button"
      onClick={() => {
        const next = resolvedTheme === "dark" ? "light" : "dark"
        setTheme(next)
      }}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg transition-all duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        resolvedTheme === "dark"
          ? "text-white hover:bg-white/10"
          : "text-black hover:bg-black/10"
      )}
      aria-label={
        resolvedTheme === "dark"
          ? "Dark mode (click for light)"
          : "Light mode (click for dark)"
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        fill="currentColor"
        strokeLinecap="round"
        viewBox="0 0 32 32"
        className="size-5"
      >
        <clipPath id="theme-toggle-clip">
          <motion.path
            animate={{
              y: resolvedTheme === "dark" ? 10 : 0,
              x: resolvedTheme === "dark" ? -12 : 0,
            }}
            transition={{ ease: "easeInOut", duration: 0.35 }}
            d="M0-5h30a1 1 0 0 0 9 13v24H0Z"
          />
        </clipPath>
        <g clipPath="url(#theme-toggle-clip)">
          <circle
            r={resolvedTheme === "dark" ? 10 : 8}
            cx="16"
            cy="16"
          />
          <motion.g
            initial={false}
            animate={{
              rotate: resolvedTheme === "dark" ? -100 : 0,
              scale: resolvedTheme === "dark" ? 0.5 : 1,
              opacity: resolvedTheme === "dark" ? 0 : 1,
            }}
            transition={{ ease: "easeInOut", duration: 0.35 }}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M16 5.5v-4" />
            <path d="M16 30.5v-4" />
            <path d="M1.5 16h4" />
            <path d="M26.5 16h4" />
            <path d="m23.4 8.6 2.8-2.8" />
            <path d="m5.7 26.3 2.9-2.9" />
            <path d="m5.8 5.8 2.8 2.8" />
            <path d="m23.4 23.4 2.9 2.9" />
          </motion.g>
        </g>
      </svg>
    </button>
  )
}
