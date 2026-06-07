// shieldcn — lib/gen/search-params.ts
// nuqs search param parsers for the badge generator

import {
  parseAsString,
  parseAsStringEnum,
  parseAsBoolean,
  createSearchParamsCache,
} from "nuqs/server"
import type { Variant, Size, Mode, Theme, Font } from "./shieldcn"

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
const FONTS: Font[] = [
  "inter",
  "geist",
  "geist-mono",
  "jetbrains-mono",
  "fira-code",
  "roboto",
  "space-grotesk",
]

export const genSearchParams = {
  url: parseAsString.withDefault(""),
  variant: parseAsStringEnum(VARIANTS).withDefault("default"),
  size: parseAsStringEnum(SIZES).withDefault("sm"),
  mode: parseAsStringEnum(MODES).withDefault("dark"),
  theme: parseAsStringEnum(THEMES).withDefault("none"),
  font: parseAsStringEnum(FONTS).withDefault("inter"),
  themeAware: parseAsBoolean.withDefault(false),
}

export const genSearchParamsCache = createSearchParamsCache(genSearchParams)
