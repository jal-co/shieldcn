// shieldcn — lib/gen/profile-search-params.ts
// nuqs search param parsers for the profile badge generator

import {
  parseAsString,
  parseAsStringEnum,
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

export const profileSearchParams = {
  user: parseAsString.withDefault(""),
  variant: parseAsStringEnum(VARIANTS).withDefault("default"),
  size: parseAsStringEnum(SIZES).withDefault("sm"),
  mode: parseAsStringEnum(MODES).withDefault("dark"),
  theme: parseAsStringEnum(THEMES).withDefault("none"),
  font: parseAsStringEnum(FONTS).withDefault("inter"),
}

export const profileSearchParamsCache = createSearchParamsCache(profileSearchParams)
