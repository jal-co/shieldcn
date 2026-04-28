// shieldcn — lib/gen/profile-search-params.ts
// nuqs search param parsers for the profile badge generator

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

export const profileSearchParams = {
  user: parseAsString.withDefault(""),
  variant: parseAsStringEnum(VARIANTS).withDefault("default"),
  size: parseAsStringEnum(SIZES).withDefault("sm"),
  mode: parseAsStringEnum(MODES).withDefault("dark"),
  theme: parseAsStringEnum(THEMES).withDefault("none"),
}

export const profileSearchParamsCache = createSearchParamsCache(profileSearchParams)
