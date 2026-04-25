/**
 * shieldcn
 * lib/registry
 *
 * Registry item lookup and JSON response builder.
 * Reads component source files from disk and inlines them
 * into the shadcn registry JSON format.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import registryData from "@/registry.json"

interface RegistryFile {
  path: string
  type: string
  target?: string
}

interface RegistryItem {
  name: string
  type: string
  title: string
  description: string
  dependencies?: string[]
  registryDependencies?: string[]
  categories?: string[]
  files: RegistryFile[]
}

/**
 * Look up a registry item by name.
 */
export function getRegistryItem(name: string): RegistryItem | null {
  return (
    (registryData.items as RegistryItem[]).find(
      (item) => item.name === name
    ) ?? null
  )
}

/**
 * Get all registry item names for static route generation.
 */
export function getAllItemNames(): string[] {
  return (registryData.items as RegistryItem[]).map((item) => item.name)
}

/**
 * Build a full registry item JSON response with inlined file contents.
 * Used by the /r/[name] route handler.
 */
export function buildRegistryItemResponse(name: string): object | null {
  const item = getRegistryItem(name)
  if (!item) return null

  const filesWithContent = item.files.map((file) => {
    const filePath = join(process.cwd(), file.path)
    const content = readFileSync(filePath, "utf-8")
    return {
      ...file,
      content,
    }
  })

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    ...item,
    files: filesWithContent,
  }
}
