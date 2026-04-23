"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Paintbrush, X, RotateCcw } from "lucide-react"
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
          const next = theme === "system"
            ? (resolvedTheme === "dark" ? "light" : "dark")
            : theme === "light"
              ? "dark"
              : "system"
          setTheme(next)
        }}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label={
          theme === "system"
            ? "System theme (click for light)"
            : theme === "light"
              ? "Light mode (click for dark)"
              : "Dark mode (click for system)"
        }
      >
        {theme === "system" ? (
          <Monitor className="size-4" />
        ) : resolvedTheme === "dark" ? (
          <Moon className="size-4" />
        ) : (
          <Sun className="size-4" />
        )}
      </button>

      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
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
            className="z-50 w-[360px] rounded-xl border bg-popover p-4 shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
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
