/**
 * shieldcn CLI
 * src/types.ts
 */

export type BadgeGroup =
  | "github"
  | "package"
  | "stack"
  | "tooling"
  | "modern"
  | "community"

export type Badge = {
  id: string
  group: BadgeGroup
  label: string
  path: string
  query: Record<string, string>
  enabled: boolean
  linkUrl?: string
}

export type InspectResult = {
  source: { owner: string; repo: string; url: string }
  badges: Badge[]
  notes: string[]
  existingShieldsIoUrls: string[]
}

export type PackageJson = {
  name?: string
  version?: string
  private?: boolean
  license?: string
  type?: string
  types?: string
  typings?: string
  bin?: unknown
  sideEffects?: unknown
  workspaces?: unknown
  exports?: unknown
  engines?: Record<string, string>
  packageManager?: string
  homepage?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

export type GlobalSettings = {
  variant: string
  size: string
  mode: string
  theme: string
}
