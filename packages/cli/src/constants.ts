/**
 * shieldcn CLI
 * src/constants.ts
 */

export const SHIELDCN_BASE = "https://www.shieldcn.dev"

export const RAW_GH = "https://raw.githubusercontent.com"
export const NPM_REGISTRY = "https://registry.npmjs.org"

export const INJECT_START = "<!-- shieldcn-start -->"
export const INJECT_END = "<!-- shieldcn-end -->"

export const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "branded",
] as const

export type Variant = (typeof VARIANTS)[number]

export const SIZES = ["xs", "sm", "default", "lg"] as const
export type Size = (typeof SIZES)[number]

export const MODES = ["dark", "light"] as const
export type Mode = (typeof MODES)[number]

export const THEMES = [
  "zinc",
  "slate",
  "stone",
  "neutral",
  "gray",
  "blue",
  "green",
  "rose",
  "orange",
  "amber",
  "violet",
  "purple",
  "red",
  "cyan",
  "emerald",
] as const
export type Theme = (typeof THEMES)[number]
