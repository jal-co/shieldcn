// shieldcn — lib/gen/search-params.ts
// nuqs search param parsers for the badge generator

import {
  parseAsString,
  parseAsStringEnum,
  createSearchParamsCache,
} from "nuqs/server"
import type { Variant, Size, Mode, Theme } from "./shieldcn"

const VARIANTS: Variant[] = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "branded",
]
const SIZES: Size[] = ["xs", "sm", "default", "lg"]
const MODES: Mode[] = ["dark", "light"]
const THEMES: Theme[] = [
  "none",
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
]

export const genSearchParams = {
  url: parseAsString.withDefault(""),
  variant: parseAsStringEnum(VARIANTS).withDefault("default"),
  size: parseAsStringEnum(SIZES).withDefault("sm"),
  mode: parseAsStringEnum(MODES).withDefault("dark"),
  theme: parseAsStringEnum(THEMES).withDefault("none"),
}

export const genSearchParamsCache = createSearchParamsCache(genSearchParams)
