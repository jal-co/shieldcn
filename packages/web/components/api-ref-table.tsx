"use client"

/**
 * jalco-ui
 * ApiRefTable
 * by Justin Levine
 * ui.justinlevine.me
 *
 * Expandable API reference table with syntax-highlighted types and collapsible rows.
 *
 * Props:
 * - title: table heading
 * - props: array of prop definitions (name, type, required, description, fullType)
 *
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface ApiProp {
  name: string
  type: string
  required?: boolean
  description?: string
  fullType?: string
}

interface ApiRefTableProps extends React.ComponentProps<"div"> {
  title: string
  props: ApiProp[]
}

function typeColor(type: string) {
  const base = type.replace(/[[\]?|]/g, "").trim().toLowerCase()
  if (base === "string") return "text-sky-400"
  if (base === "number") return "text-amber-400"
  if (base === "boolean") return "text-purple-400"
  if (base === "function") return "text-rose-400"
  if (base === "reactnode" || base === "react.reactnode") return "text-teal-400"
  if (base === "undefined") return "text-blue-400"
  if (base === "null") return "text-gray-400"
  return "text-emerald-400"
}

function TypeDisplay({ type }: { type: string }) {
  const parts = type.split(/(\s*\|\s*)/)
  return (
    <span className="font-mono text-sm">
      {parts.map((part, i) => {
        const trimmed = part.trim()
        if (trimmed === "|") {
          return (
            <span key={i} className="text-muted-foreground">
              {" | "}
            </span>
          )
        }
        return (
          <span key={i} className={typeColor(trimmed)}>
            {trimmed}
          </span>
        )
      })}
    </span>
  )
}

function ApiRefRow({ prop }: { prop: ApiProp }) {
  const [open, setOpen] = React.useState(false)
  const hasDetails = prop.description || prop.fullType

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        type="button"
        onClick={() => hasDetails && setOpen(!open)}
        disabled={!hasDetails}
        className={cn(
          "flex w-full items-center gap-4 px-4 py-3 text-left transition-colors",
          hasDetails && "cursor-pointer hover:bg-muted/30",
          !hasDetails && "cursor-default"
        )}
        aria-expanded={hasDetails ? open : undefined}
      >
        <span className="min-w-[180px] shrink-0 font-mono text-sm">
          <span className="text-sky-300">{prop.name}</span>
          {!prop.required && (
            <span className="text-muted-foreground">?</span>
          )}
        </span>
        <span className="flex-1">
          <TypeDisplay type={prop.type} />
        </span>
        {hasDetails && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>
      {open && hasDetails && (
        <div className="space-y-2 border-t border-border/30 bg-muted/20 px-4 py-3">
          {prop.description && (
            <p className="text-sm text-muted-foreground">{prop.description}</p>
          )}
          {prop.fullType && (
            <div className="flex items-baseline gap-6">
              <span className="shrink-0 text-sm text-muted-foreground">Type</span>
              <TypeDisplay type={prop.fullType} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ApiRefTable({ title, props, className, ...rest }: ApiRefTableProps) {
  return (
    <div data-slot="api-ref-table" className={cn("overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm", className)} {...rest}>
      <div className="border-b border-border/40 px-4 py-3">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      </div>
      <div className="flex items-center gap-4 border-b border-border/40 bg-muted/40 px-4 py-2.5">
        <span className="min-w-[180px] shrink-0 text-sm font-medium text-muted-foreground">
          Prop
        </span>
        <span className="text-sm font-medium text-muted-foreground">Type</span>
      </div>
      {props.map((prop) => (
        <ApiRefRow key={prop.name} prop={prop} />
      ))}
    </div>
  )
}
