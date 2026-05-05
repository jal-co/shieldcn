/**
 * shieldcn CLI
 * src/bin.ts
 *
 * Main entry point. Scans a GitHub repo (remote or local), detects the
 * stack, and outputs copy-paste badge markdown for your README.
 */

import { defineCommand, runMain } from "citty"
import consola from "consola"
import pc from "picocolors"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { execSync } from "node:child_process"
import { inspectLocal, inspectRemote } from "./detect.js"
import { formatMarkdown, formatFlatMarkdown, formatHtml, formatJson } from "./output.js"
import { migrateAll, replaceShieldsUrls } from "./migrate.js"
import { findReadme, injectBadges, hasMarkers } from "./inject.js"
import { VARIANTS, SIZES, THEMES, SHIELDCN_BASE } from "./constants.js"
import type { GlobalSettings, Badge } from "./types.js"

const version = "1.0.0"

// ── Helpers ───────────────────────────────────────────────────────────

function copyToClipboard(text: string): boolean {
  try {
    const platform = process.platform
    if (platform === "darwin") {
      execSync("pbcopy", { input: text })
      return true
    } else if (platform === "linux") {
      try {
        execSync("xclip -selection clipboard", { input: text })
        return true
      } catch {
        try {
          execSync("xsel --clipboard --input", { input: text })
          return true
        } catch {
          return false
        }
      }
    } else if (platform === "win32") {
      execSync("clip", { input: text })
      return true
    }
    return false
  } catch {
    return false
  }
}

function printHeader() {
  console.log()
  console.log(pc.bold("  shieldcn") + pc.dim(" — beautiful README badges"))
  console.log(pc.dim(`  ${SHIELDCN_BASE}`))
  console.log()
}

function printBadgeSummary(badges: Badge[]) {
  const enabled = badges.filter((b) => b.enabled)
  const groups = new Map<string, Badge[]>()
  for (const b of enabled) {
    const list = groups.get(b.group) ?? []
    list.push(b)
    groups.set(b.group, list)
  }

  const groupNames: Record<string, string> = {
    github: "GitHub",
    package: "Package",
    tooling: "Tooling",
    stack: "Stack",
    modern: "Modern",
    community: "Community",
  }

  for (const [group, list] of groups) {
    const name = groupNames[group] ?? group
    const labels = list.map((b) => b.label).join(", ")
    console.log(`  ${pc.green("✓")} ${pc.bold(name)} ${pc.dim(`(${list.length})`)} ${pc.dim(labels)}`)
  }
  console.log()
  console.log(pc.dim(`  ${enabled.length} badges total`))
}

// ── Generate command ──────────────────────────────────────────────────

const generate = defineCommand({
  meta: {
    name: "shieldcn",
    version,
    description: "Generate beautiful README badges from your terminal.",
  },
  args: {
    target: {
      type: "positional",
      description: "GitHub URL, owner/repo, or local path (defaults to current directory)",
      required: false,
    },
    variant: {
      type: "string",
      description: `Badge variant: ${VARIANTS.join(", ")}`,
    },
    size: {
      type: "string",
      description: `Badge size: ${SIZES.join(", ")}`,
    },
    theme: {
      type: "string",
      description: `Color theme: ${THEMES.join(", ")}`,
    },
    mode: {
      type: "string",
      description: "Color mode: dark, light",
    },
    format: {
      type: "string",
      description: "Output format: markdown (default), flat, html, json",
      default: "markdown",
    },
    inject: {
      type: "boolean",
      description: "Inject badges into README between <!-- shieldcn-start/end --> markers",
      default: false,
    },
    copy: {
      type: "boolean",
      description: "Copy output to clipboard",
      default: false,
    },
    json: {
      type: "boolean",
      description: "Output as JSON (shortcut for --format json)",
      default: false,
    },
    compact: {
      type: "boolean",
      description: "Output badges without group headers",
      default: false,
    },
  },
  run: async ({ args }) => {
    printHeader()

    const target = (args.target as string) || "."
    const isLocal = target === "." || target.startsWith("/") || target.startsWith("./") || target.startsWith("../")

    // Build global settings
    const global: GlobalSettings = {
      variant: (args.variant as string) || "default",
      size: (args.size as string) || "sm",
      mode: (args.mode as string) || "dark",
      theme: (args.theme as string) || "",
    }

    // Validate variant
    if (global.variant && !VARIANTS.includes(global.variant as typeof VARIANTS[number])) {
      consola.error(`Invalid variant "${global.variant}". Valid: ${VARIANTS.join(", ")}`)
      process.exit(1)
    }

    // Validate size
    if (global.size && !SIZES.includes(global.size as typeof SIZES[number])) {
      consola.error(`Invalid size "${global.size}". Valid: ${SIZES.join(", ")}`)
      process.exit(1)
    }

    // Inspect
    consola.start(
      isLocal
        ? `Scanning local directory ${pc.cyan(resolve(target))}...`
        : `Scanning ${pc.cyan(target)}...`,
    )

    const result = isLocal
      ? await inspectLocal(resolve(target))
      : await inspectRemote(target)

    if ("error" in result) {
      consola.error(result.error)
      process.exit(1)
    }

    // Print notes
    if (result.notes.length > 0) {
      for (const note of result.notes) {
        consola.info(pc.dim(note))
      }
    }

    // Print summary
    console.log()
    console.log(
      `  ${pc.bold(result.source.owner)}/${pc.bold(result.source.repo)} ${pc.dim("→")} ${pc.dim(result.source.url)}`,
    )
    console.log()

    printBadgeSummary(result.badges)

    // shields.io migration hint
    if (result.existingShieldsIoUrls.length > 0) {
      console.log()
      consola.info(
        `Found ${pc.yellow(String(result.existingShieldsIoUrls.length))} shields.io URLs in README. Run ${pc.cyan("shieldcn migrate")} to convert them.`,
      )
    }

    // Format output
    const format = args.json ? "json" : (args.format as string) || "markdown"
    let output: string

    switch (format) {
      case "json":
        output = formatJson(result, global)
        break
      case "html":
        output = formatHtml(result, global)
        break
      case "flat":
        output = formatFlatMarkdown(result, global)
        break
      case "markdown":
      default:
        output = formatMarkdown(result, global, { compact: args.compact })
        break
    }

    // Inject into README
    if (args.inject) {
      const readmePath = findReadme(isLocal ? resolve(target) : ".")
      if (!readmePath) {
        consola.error("No README.md found to inject into.")
        process.exit(1)
      }

      const flatOutput = formatFlatMarkdown(result, global)
      const content = readFileSync(readmePath, "utf-8")
      const updated = injectBadges(content, flatOutput)
      writeFileSync(readmePath, updated, "utf-8")

      const verb = hasMarkers(content) ? "Updated" : "Added"
      consola.success(`${verb} badges in ${pc.cyan(readmePath)}`)
      return
    }

    // Output
    console.log()
    console.log(pc.dim("─".repeat(60)))
    console.log()
    console.log(output)
    console.log()
    console.log(pc.dim("─".repeat(60)))

    // Copy to clipboard
    if (args.copy) {
      if (copyToClipboard(output)) {
        consola.success("Copied to clipboard")
      } else {
        consola.warn("Could not copy to clipboard")
      }
    }
  },
})

// ── Migrate subcommand ────────────────────────────────────────────────

const migrate = defineCommand({
  meta: {
    name: "migrate",
    description: "Convert shields.io URLs in README to shieldcn.",
  },
  args: {
    file: {
      type: "positional",
      description: "Path to README file (defaults to README.md in current directory)",
      required: false,
    },
    dry: {
      type: "boolean",
      description: "Preview changes without writing",
      default: false,
    },
    write: {
      type: "boolean",
      description: "Write changes to file",
      default: false,
    },
  },
  run: async ({ args }) => {
    printHeader()

    const filePath = (args.file as string) || findReadme(".") || "README.md"
    let content: string

    try {
      content = readFileSync(filePath, "utf-8")
    } catch {
      consola.error(`Could not read ${pc.cyan(filePath)}`)
      process.exit(1)
    }

    const migrations = migrateAll(content)

    if (migrations.length === 0) {
      consola.success("No shields.io URLs found. Nothing to migrate.")
      return
    }

    console.log(`  Found ${pc.yellow(String(migrations.length))} shields.io badge(s):\n`)

    for (let i = 0; i < migrations.length; i++) {
      const m = migrations[i]!
      console.log(`  ${pc.dim(`${i + 1}.`)} ${pc.strikethrough(pc.red(m.original))}`)
      console.log(`     ${pc.green("→")} ${pc.green(m.converted)}`)
      console.log()
    }

    if (args.dry) {
      consola.info("Dry run — no changes written.")
      return
    }

    if (args.write) {
      const updated = replaceShieldsUrls(content, migrations)
      writeFileSync(filePath, updated, "utf-8")
      consola.success(`Updated ${pc.cyan(filePath)} with ${migrations.length} replacement(s).`)
      return
    }

    // Interactive prompt
    const confirmed = await consola.prompt(
      `Replace ${migrations.length} URL(s) in ${filePath}?`,
      { type: "confirm" },
    )

    if (confirmed) {
      const updated = replaceShieldsUrls(content, migrations)
      writeFileSync(filePath, updated, "utf-8")
      consola.success(`Updated ${pc.cyan(filePath)} with ${migrations.length} replacement(s).`)
    } else {
      consola.info("No changes made.")
    }
  },
})

// ── Init subcommand ───────────────────────────────────────────────────

const init = defineCommand({
  meta: {
    name: "init",
    description: "Add shieldcn markers to your README for badge injection.",
  },
  args: {
    file: {
      type: "positional",
      description: "Path to README file",
      required: false,
    },
  },
  run: async ({ args }) => {
    printHeader()

    const filePath = (args.file as string) || findReadme(".") || "README.md"
    let content: string

    try {
      content = readFileSync(filePath, "utf-8")
    } catch {
      consola.error(`Could not read ${pc.cyan(filePath)}`)
      process.exit(1)
    }

    if (hasMarkers(content)) {
      consola.info(`${pc.cyan(filePath)} already has shieldcn markers.`)
      return
    }

    const updated = injectBadges(content, "<!-- your badges will appear here -->")
    writeFileSync(filePath, updated, "utf-8")
    consola.success(`Added shieldcn markers to ${pc.cyan(filePath)}`)
    consola.info(`Run ${pc.cyan("shieldcn --inject")} to populate them.`)
  },
})

// ── Run ───────────────────────────────────────────────────────────────

// Use manual arg routing to support both positional target AND subcommands.
// citty doesn't handle `shieldcn vercel/next.js` + `shieldcn migrate` together.

const args = process.argv.slice(2)
const firstArg = args[0]

if (firstArg === "migrate") {
  process.argv = [process.argv[0]!, process.argv[1]!, ...args.slice(1)]
  runMain(migrate)
} else if (firstArg === "init") {
  process.argv = [process.argv[0]!, process.argv[1]!, ...args.slice(1)]
  runMain(init)
} else if (firstArg === "--help" || firstArg === "-h") {
  runMain(generate)
} else if (firstArg === "--version" || firstArg === "-v") {
  console.log(version)
} else {
  runMain(generate)
}
