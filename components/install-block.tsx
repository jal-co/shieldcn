"use client"

/**
 * shieldcn
 * InstallBlock
 *
 * Registry install command block with package manager tabs.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface InstallBlockProps {
  /** Registry item name (e.g. "readme-badge"). */
  name: string
  className?: string
}

const managers = [
  { id: "pnpm", label: "pnpm", cmd: (n: string) => `pnpm dlx shadcn@latest add @shieldcn/${n}` },
  { id: "npx", label: "npx", cmd: (n: string) => `npx shadcn@latest add @shieldcn/${n}` },
  { id: "yarn", label: "yarn", cmd: (n: string) => `npx shadcn@latest add @shieldcn/${n}` },
  { id: "bun", label: "bun", cmd: (n: string) => `bunx --bun shadcn@latest add @shieldcn/${n}` },
] as const

export function InstallBlock({ name, className }: InstallBlockProps) {
  const [active, setActive] = React.useState<string>("pnpm")
  const [copied, setCopied] = React.useState(false)

  const command = managers.find((m) => m.id === active)?.cmd(name) ?? ""

  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [command])

  return (
    <div
      className={cn(
        "not-prose overflow-hidden rounded-lg border border-border/60 shadow-xs",
        className
      )}
    >
      <div className="flex items-center border-b border-border/40 bg-muted/40">
        {managers.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setActive(m.id)}
            className={cn(
              "px-3 py-2 text-xs font-medium transition-colors",
              active === m.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
        <div className="ml-auto pr-2">
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
              copied
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="bg-muted/20 px-4 py-3">
        <code className="font-mono text-sm text-foreground">{command}</code>
      </div>
    </div>
  )
}
