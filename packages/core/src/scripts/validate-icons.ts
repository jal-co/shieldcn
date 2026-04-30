#!/usr/bin/env npx tsx
/**
 * shieldcn
 * scripts/validate-icons
 *
 * Validates all custom icons in the registry.
 * Run: npx tsx packages/core/src/scripts/validate-icons.ts
 */

import { validateCustomIcons, listCustomIcons } from "../badges/custom-icons"

const icons = listCustomIcons()
console.log(`\n🔍 Validating ${icons.length} custom icon(s): ${icons.join(", ")}\n`)

const issues = validateCustomIcons()

if (issues.length === 0) {
  console.log("✅ All custom icons are valid.\n")
  process.exit(0)
} else {
  console.log(`❌ Found ${issues.length} issue(s):\n`)
  for (const issue of issues) {
    console.log(`  • ${issue}`)
  }
  console.log()
  process.exit(1)
}
