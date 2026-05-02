"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Paintbrush, X, RotateCcw } from "lucide-react"
import { motion } from "motion/react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const CSS_VAR_RE = /--([\w-]+)\s*:\s*([^;]+)/g
const STORAGE_KEY = "shieldcn-custom-theme"

function parseThemeCSS(css: string): {
  light: Record<string, string>
  dark: Record<string, string>
} {
  const light: Record<string, string> = {}
  const dark: Record<string, string> = {}

  const darkMatch = css.match(/\.dark\s*\{([\s\S]+?)\}/)
  const rootMatch = css.match(/:root\s*\{([\s\S]+?)\}/)

  if (rootMatch) {
    for (const [, name, value] of rootMatch[1].matchAll(CSS_VAR_RE)) {
      light[name] = value.trim()
    }
  }

  if (darkMatch) {
    for (const [, name, value] of darkMatch[1].matchAll(CSS_VAR_RE)) {
      dark[name] = value.trim()
    }
  }

  return { light, dark }
}

function applyCustomVars(vars: Record<string, string>) {
  for (const [name, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(`--${name}`, value)
  }
}

function clearCustomVars(vars: Record<string, string>) {
  for (const name of Object.keys(vars)) {
    document.documentElement.style.removeProperty(`--${name}`)
  }
}

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [customCSS, setCustomCSS] = React.useState("")
  const [hasCustom, setHasCustom] = React.useState(false)
  const appliedVarsRef = React.useRef<Record<string, string>>({})

  const applyFromCSS = React.useCallback(
    (css: string, currentResolvedTheme: string | undefined) => {
      if (Object.keys(appliedVarsRef.current).length > 0) {
        clearCustomVars(appliedVarsRef.current)
      }

      const parsed = parseThemeCSS(css)
      const isDark = currentResolvedTheme === "dark"
      const vars =
        isDark && Object.keys(parsed.dark).length > 0
          ? parsed.dark
          : parsed.light

      if (Object.keys(vars).length > 0) {
        applyCustomVars(vars)
        appliedVarsRef.current = vars
        setHasCustom(true)
      }
    },
    []
  )

  const customCSSRef = React.useRef(customCSS)
  customCSSRef.current = customCSS

  const hasCustomRef = React.useRef(hasCustom)
  hasCustomRef.current = hasCustom

  React.useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setCustomCSS(saved)
    }
  }, [])

  React.useEffect(() => {
    if (!mounted) return

    const saved = localStorage.getItem(STORAGE_KEY)
    const css = saved || (hasCustomRef.current ? customCSSRef.current : "")
    if (css) {
      applyFromCSS(css, resolvedTheme)
    }
  }, [mounted, resolvedTheme, applyFromCSS])

  function handleApply() {
    if (!customCSS.trim()) return
    localStorage.setItem(STORAGE_KEY, customCSS)
    applyFromCSS(customCSS, resolvedTheme)
    setOpen(false)
  }

  function handleReset() {
    clearCustomVars(appliedVarsRef.current)
    appliedVarsRef.current = {}
    setCustomCSS("")
    setHasCustom(false)
    localStorage.removeItem(STORAGE_KEY)
    setOpen(false)
  }

  if (!mounted) {
    return <div className="size-8" />
  }

  return (
    <div className="flex items-center gap-1">
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
            <motion.circle
              animate={{ r: resolvedTheme === "dark" ? 10 : 8 }}
              transition={{ ease: "easeInOut", duration: 0.35 }}
              cx="16"
              cy="16"
            />
            <motion.g
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

      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className={cn(
              "hidden size-8 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 min-[360px]:inline-flex",
              hasCustom
                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground"
            )}
            aria-label="Custom theme"
          >
            <Paintbrush className="size-3.5" />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side="bottom"
            align="end"
            sideOffset={8}
            className="z-50 w-[calc(100vw-1rem)] max-w-[360px] rounded-xl border bg-popover p-4 shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-semibold">Custom Theme</h3>
                  <p className="text-xs text-muted-foreground">
                    Paste your CSS theme variables
                  </p>
                </div>
                <PopoverPrimitive.Close asChild>
                  <button
                    type="button"
                    className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="size-3.5" />
                  </button>
                </PopoverPrimitive.Close>
              </div>

              <textarea
                value={customCSS}
                onChange={(e) => setCustomCSS(e.target.value)}
                placeholder={`:root {\n  --background: oklch(0.99 0 0);\n  --foreground: oklch(0 0 0);\n  /* ... */\n}\n\n.dark {\n  --background: oklch(0 0 0);\n  --foreground: oklch(1 0 0);\n  /* ... */\n}`}
                className="h-48 w-full resize-none rounded-lg border border-border/60 bg-muted/30 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                spellCheck={false}
              />

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Paste a{" "}
                <code className="rounded bg-muted px-1 py-0.5">:root</code> and
                optional{" "}
                <code className="rounded bg-muted px-1 py-0.5">.dark</code>{" "}
                block with CSS custom properties. Supports shadcn/ui theme
                format. Variables are applied live and saved to localStorage.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!customCSS.trim()}
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  Apply Theme
                </button>
                {hasCustom && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <RotateCcw className="size-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  )
}
