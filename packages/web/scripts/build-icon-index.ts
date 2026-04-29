/**
 * shieldcn
 * scripts/build-icon-index
 *
 * Generates packages/core/src/badges/icon-list.json with icons from:
 * - SimpleIcons (~3,400 brand icons)
 * - Lucide (lu: prefix, ~1,500 utility icons)
 * - FontAwesome (fa: prefix, ~1,600 icons)
 * - Heroicons (hi2: prefix, ~900 icons)
 * - Tabler (tb: prefix, ~5,900 icons)
 * - Phosphor (pi: prefix, ~9,000 icons)
 * - Material Design (md: prefix, ~4,300 icons)
 * - Bootstrap Icons (bs: prefix, ~2,700 icons)
 * - Remix Icons (ri-pack: prefix, ~3,000 icons)
 * - Feather (fi: prefix, ~280 icons)
 *
 * Output format:
 * [{ slug, title, source, prefix, category? }]
 */

import * as fs from "node:fs"
import * as path from "node:path"

interface IconEntry {
  /** The slug used in URLs. For SimpleIcons: bare slug. For others: prefix:Name */
  slug: string
  /** Human-readable display title */
  title: string
  /** Source library */
  source: "simple" | "lucide" | "fa" | "heroicons" | "tabler" | "phosphor" | "material" | "bootstrap" | "remix" | "feather"
  /** Category tag for filtering */
  category?: string
}

/** Convert PascalCase component name to human-readable title */
function humanize(name: string, prefix: string): string {
  // Strip prefix: LuArrowRight → ArrowRight, FaReact → React
  let stripped = name
  if (stripped.startsWith(prefix)) {
    stripped = stripped.slice(prefix.length)
  }

  // PascalCase to spaces: ArrowRight → Arrow Right
  return stripped
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/(\d)([A-Z])/g, "$1 $2")
    .trim()
}

/** Categorize an icon based on its name */
function categorize(name: string): string | undefined {
  const lower = name.toLowerCase()
  if (/arrow|chevron|caret|move|expand|collapse|corner/.test(lower)) return "arrows"
  if (/file|folder|document|page|clipboard|note|book/.test(lower)) return "files"
  if (/user|person|people|group|team|contact/.test(lower)) return "users"
  if (/heart|star|thumb|like|bookmark|flag/.test(lower)) return "social"
  if (/play|pause|stop|skip|volume|music|video|mic/.test(lower)) return "media"
  if (/lock|unlock|shield|key|eye|fingerprint|scan/.test(lower)) return "security"
  if (/mail|message|chat|phone|bell|inbox|send/.test(lower)) return "communication"
  if (/cart|shop|bag|credit|dollar|wallet|receipt|tag|store/.test(lower)) return "commerce"
  if (/home|building|map|pin|globe|location|compass|navigation/.test(lower)) return "places"
  if (/sun|moon|cloud|rain|snow|wind|thermometer|weather/.test(lower)) return "weather"
  if (/check|circle|square|triangle|x|minus|plus|slash/.test(lower)) return "shapes"
  if (/code|terminal|bug|database|server|cpu|hard|git|api/.test(lower)) return "development"
  if (/setting|gear|wrench|tool|hammer|filter|sliders/.test(lower)) return "settings"
  if (/search|zoom|magnifying/.test(lower)) return "search"
  if (/download|upload|cloud|share|link|external/.test(lower)) return "transfer"
  if (/alert|warning|info|help|question|error/.test(lower)) return "alerts"
  if (/calendar|clock|timer|watch|hour/.test(lower)) return "time"
  if (/image|camera|photo|picture|crop|palette/.test(lower)) return "images"
  if (/chart|graph|bar|pie|trending|analytics|activity/.test(lower)) return "charts"
  if (/table|list|grid|layout|column|row|sidebar/.test(lower)) return "layout"
  if (/edit|pen|pencil|type|text|font|bold|italic|align/.test(lower)) return "editing"
  return undefined
}

async function buildIndex() {
  const icons: IconEntry[] = []

  // 1. SimpleIcons
  console.log("Loading SimpleIcons...")
  const allSI = await import("simple-icons")
  let siCount = 0
  for (const [key, val] of Object.entries(allSI)) {
    if (!key.startsWith("si") || typeof val !== "object" || !val) continue
    const icon = val as { title: string; slug: string; hex: string; path: string }
    if (!icon.slug || !icon.path) continue
    icons.push({
      slug: icon.slug,
      title: icon.title,
      source: "simple",
    })
    siCount++
  }
  console.log(`  SimpleIcons: ${siCount}`)

  // 2. Lucide (via react-icons/lu)
  console.log("Loading Lucide...")
  const luPack = await import("react-icons/lu")
  let luCount = 0
  for (const name of Object.keys(luPack)) {
    if (!name.startsWith("Lu") || name.length < 3) continue
    const title = humanize(name, "Lu")
    icons.push({
      slug: `lu:${name.slice(2)}`,
      title,
      source: "lucide",
      category: categorize(title),
    })
    luCount++
  }
  console.log(`  Lucide: ${luCount}`)

  // 3. FontAwesome (via react-icons/fa)
  console.log("Loading FontAwesome...")
  const faPack = await import("react-icons/fa")
  let faCount = 0
  for (const name of Object.keys(faPack)) {
    if (!name.startsWith("Fa") || name.length < 3) continue
    const title = humanize(name, "Fa")
    icons.push({
      slug: `ri:${name}`,
      title: `${title}`,
      source: "fa",
      category: categorize(title),
    })
    faCount++
  }
  console.log(`  FontAwesome: ${faCount}`)

  // 4. Heroicons v2 (via react-icons/hi2)
  console.log("Loading Heroicons...")
  const hi2Pack = await import("react-icons/hi2")
  let hiCount = 0
  for (const name of Object.keys(hi2Pack)) {
    if (!name.startsWith("Hi") || name.length < 3) continue
    const title = humanize(name, "Hi")
    icons.push({
      slug: `ri:${name}`,
      title: `${title}`,
      source: "heroicons",
      category: categorize(title),
    })
    hiCount++
  }
  console.log(`  Heroicons: ${hiCount}`)

  // 5. Tabler (via react-icons/tb)
  console.log("Loading Tabler...")
  const tbPack = await import("react-icons/tb")
  let tbCount = 0
  for (const name of Object.keys(tbPack)) {
    if (!name.startsWith("Tb") || name.length < 3) continue
    const title = humanize(name, "Tb")
    icons.push({
      slug: `ri:${name}`,
      title: `${title}`,
      source: "tabler",
      category: categorize(title),
    })
    tbCount++
  }
  console.log(`  Tabler: ${tbCount}`)

  // 6. Phosphor (via react-icons/pi)
  console.log("Loading Phosphor...")
  const piPack = await import("react-icons/pi")
  let piCount = 0
  for (const name of Object.keys(piPack)) {
    if (!name.startsWith("Pi") || name.length < 3) continue
    const title = humanize(name, "Pi")
    icons.push({
      slug: `ri:${name}`,
      title: `${title}`,
      source: "phosphor",
      category: categorize(title),
    })
    piCount++
  }
  console.log(`  Phosphor: ${piCount}`)

  // 7. Material Design (via react-icons/md)
  console.log("Loading Material Design...")
  const mdPack = await import("react-icons/md")
  let mdCount = 0
  for (const name of Object.keys(mdPack)) {
    if (!name.startsWith("Md") || name.length < 3) continue
    const title = humanize(name, "Md")
    icons.push({
      slug: `ri:${name}`,
      title: `${title}`,
      source: "material",
      category: categorize(title),
    })
    mdCount++
  }
  console.log(`  Material Design: ${mdCount}`)

  // 8. Bootstrap Icons (via react-icons/bs)
  console.log("Loading Bootstrap Icons...")
  const bsPack = await import("react-icons/bs")
  let bsCount = 0
  for (const name of Object.keys(bsPack)) {
    if (!name.startsWith("Bs") || name.length < 3) continue
    const title = humanize(name, "Bs")
    icons.push({
      slug: `ri:${name}`,
      title: `${title}`,
      source: "bootstrap",
      category: categorize(title),
    })
    bsCount++
  }
  console.log(`  Bootstrap Icons: ${bsCount}`)

  // 9. Feather (via react-icons/fi)
  console.log("Loading Feather...")
  const fiPack = await import("react-icons/fi")
  let fiCount = 0
  for (const name of Object.keys(fiPack)) {
    if (!name.startsWith("Fi") || name.length < 3) continue
    const title = humanize(name, "Fi")
    icons.push({
      slug: `ri:${name}`,
      title: `${title}`,
      source: "feather",
      category: categorize(title),
    })
    fiCount++
  }
  console.log(`  Feather: ${fiCount}`)

  const total = icons.length
  console.log(`\nTotal: ${total} icons`)

  // Source code mapping for compact JSON
  const SOURCE_CODES: Record<string, string> = {
    simple: "s",
    lucide: "l",
    fa: "f",
    heroicons: "h",
    tabler: "t",
    phosphor: "p",
    material: "m",
    bootstrap: "b",
    feather: "e",
  }

  // Write compact format: [slug, title, sourceCode, category?]
  // This cuts JSON size by ~40% vs objects with repeated field names
  const compact = icons.map(i => {
    const entry: (string | undefined)[] = [
      i.slug,
      i.title,
      SOURCE_CODES[i.source] || i.source,
    ]
    if (i.category) entry.push(i.category)
    return entry
  })

  const outPath = path.join(process.cwd(), "..", "core", "src", "badges", "icon-list.json")
  fs.writeFileSync(outPath, JSON.stringify(compact))
  const size = fs.statSync(outPath).size
  console.log(`Written to ${outPath} (${(size / 1024).toFixed(0)}KB)`)
}

buildIndex().catch(console.error)
