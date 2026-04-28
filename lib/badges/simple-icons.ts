/**
 * shieldcn
 * lib/badges/simple-icons
 *
 * Icon resolution for badges. Supports:
 * - SimpleIcons slugs: ?logo=react, ?logo=typescript
 * - React Icons: ?logo=ri:FaReact, ?logo=ri:MdHome
 *
 * Returns SVG path data for inline rendering in badge SVGs.
 */

import type { IconData } from "./icons"

/**
 * Look up an icon by slug. Supports SimpleIcons, React Icons, and Lucide shorthand.
 *
 * @param slug - "react" (SimpleIcons) or "ri:FaReact" (React Icons) or "lu:Check" (Lucide)
 * @param logoColor - optional override color
 */
export async function getSimpleIcon(
  slug: string,
  logoColor?: string
): Promise<{ icon: IconData; defaultColor: string } | null> {
  // Lucide shorthand: ?logo=lu:Check → react-icons/lu LuCheck
  if (slug.startsWith("lu:")) {
    const name = slug.slice(3)
    // Normalize: lu:Check → LuCheck, lu:arrow-right → LuArrowRight
    const componentName = name.startsWith("Lu")
      ? name
      : "Lu" + name.replace(/(^|-)([a-zA-Z])/g, (_, _p, c) => c.toUpperCase())
    return getReactIcon(componentName)
  }

  // React Icons: ?logo=ri:FaReact or ?logo=ri:AiFillAccountBook
  if (slug.startsWith("ri:")) {
    return getReactIcon(slug.slice(3))
  }

  // SimpleIcons
  return getSimpleIconBySlug(slug)
}

/**
 * Look up a SimpleIcon by slug.
 */
async function getSimpleIconBySlug(
  slug: string
): Promise<{ icon: IconData; defaultColor: string } | null> {
  try {
    const pascalSlug = slug.charAt(0).toUpperCase() + slug.slice(1)
    const exportName = `si${pascalSlug}`

    const allIcons = await import("simple-icons")
    const icon = (allIcons as Record<string, unknown>)[exportName] as
      | { title: string; slug: string; hex: string; path: string }
      | undefined

    if (!icon || !icon.path) return null

    return {
      icon: {
        viewBox: "0 0 24 24",
        path: icon.path,
      },
      defaultColor: icon.hex,
    }
  } catch {
    return null
  }
}

/**
 * Look up a react-icons icon by component name.
 *
 * react-icons bundles 40+ icon packs (FontAwesome, Material, Ant Design, etc.)
 * The pack is determined by the 2-char lowercase prefix of the component name:
 *   FaReact → react-icons/fa
 *   AiFillAccountBook → react-icons/ai
 *   CgAdd → react-icons/cg
 *   MdHome → react-icons/md
 *
 * Full list: https://react-icons.github.io/react-icons/
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const REACT_ICON_PACKS: Record<string, () => Promise<any>> = {
  ai: () => import("react-icons/ai"),
  bi: () => import("react-icons/bi"),
  bs: () => import("react-icons/bs"),
  cg: () => import("react-icons/cg"),
  ci: () => import("react-icons/ci"),
  di: () => import("react-icons/di"),
  fa: () => import("react-icons/fa"),
  fc: () => import("react-icons/fc"),
  fi: () => import("react-icons/fi"),
  gi: () => import("react-icons/gi"),
  go: () => import("react-icons/go"),
  gr: () => import("react-icons/gr"),
  hi: () => import("react-icons/hi"),
  im: () => import("react-icons/im"),
  io: () => import("react-icons/io"),
  lia: () => import("react-icons/lia"),
  lu: () => import("react-icons/lu"),
  md: () => import("react-icons/md"),
  pi: () => import("react-icons/pi"),
  ri: () => import("react-icons/ri"),
  rx: () => import("react-icons/rx"),
  si: () => import("react-icons/si"),
  sl: () => import("react-icons/sl"),
  tb: () => import("react-icons/tb"),
  tfi: () => import("react-icons/tfi"),
  ti: () => import("react-icons/ti"),
  vsc: () => import("react-icons/vsc"),
  wi: () => import("react-icons/wi"),
}

async function getReactIcon(
  name: string
): Promise<{ icon: IconData; defaultColor: string } | null> {
  try {
    // Determine pack from the prefix (2-3 lowercase chars)
    // e.g. FaReact -> "fa", MdHome -> "md", LiaAccessibleIcon -> "lia", TfiAgenda -> "tfi", VscAccount -> "vsc"
    let prefix = ""
    for (let i = 0; i < name.length; i++) {
      if (i > 0 && name[i] === name[i].toUpperCase() && name[i] !== name[i].toLowerCase()) break
      prefix += name[i].toLowerCase()
    }

    const loader = REACT_ICON_PACKS[prefix]
    if (!loader) return null

    const pack = await loader()
    const Icon = pack[name]
    if (!Icon) return null

    // Render to static SVG string
    const React = await import("react")
    const { renderToStaticMarkup } = await import("react-dom/server")
    const svg = renderToStaticMarkup(React.createElement(Icon, { size: 24 }))

    // Extract viewBox
    const vbMatch = svg.match(/viewBox="([^"]+)"/) 
    const viewBox = vbMatch ? vbMatch[1] : "0 0 24 24"

    // Check if it's stroke-based (like Lucide/Feather icons)
    const isStroke = svg.includes('fill="none"') && svg.includes('stroke="currentColor"')

    // Extract stroke properties for stroke-based icons
    let strokeWidth: number | undefined
    let strokeLinecap: string | undefined
    let strokeLinejoin: string | undefined
    if (isStroke) {
      const swMatch = svg.match(/stroke-width="([^"]+)"/)
      if (swMatch) strokeWidth = parseFloat(swMatch[1])
      const lcMatch = svg.match(/stroke-linecap="([^"]+)"/)
      if (lcMatch) strokeLinecap = lcMatch[1]
      const ljMatch = svg.match(/stroke-linejoin="([^"]+)"/)
      if (ljMatch) strokeLinejoin = ljMatch[1]
    }

    // Extract path d attributes
    const pathDs: string[] = []
    const pathElRe = /<path[^>]*>/g
    let m: RegExpExecArray | null
    while ((m = pathElRe.exec(svg)) !== null) {
      const el = m[0]
      // For stroke-based SVGs, include ALL paths (they use fill="none" globally)
      // For fill-based SVGs, skip paths with fill="none" (bounding boxes)
      if (!isStroke && /fill\s*=\s*["']none["']/i.test(el)) continue
      const dMatch = el.match(/d="([^"]+)"/) || el.match(/d='([^']+)'/)
      if (dMatch) {
        const d = dMatch[1]
        // Skip simple bounding-box rectangles like "M0 0h24v24H0z"
        if (/^M0[\s,]+0[hHvVlLzZ\d\s,.\-]+$/.test(d) && d.includes("z")) continue
        pathDs.push(d)
      }
    }

    // Extract circles
    const circleRe = /<circle[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"[^>]*r="([^"]+)"/g
    while ((m = circleRe.exec(svg)) !== null) {
      const cx = parseFloat(m[1]), cy = parseFloat(m[2]), r = parseFloat(m[3])
      if (isStroke) {
        // For stroke-based, keep as circle path (will be rendered with stroke)
        pathDs.push(`M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 -${r * 2},0`)
      } else {
        pathDs.push(`M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 -${r * 2},0`)
      }
    }

    // Extract lines
    const lineRe = /<line[^>]*x1="([^"]+)"[^>]*y1="([^"]+)"[^>]*x2="([^"]+)"[^>]*y2="([^"]+)"/g
    while ((m = lineRe.exec(svg)) !== null) {
      pathDs.push(`M${m[1]},${m[2]}L${m[3]},${m[4]}`)
    }

    // Extract polylines and polygons
    const polyRe = /<poly(line|gon)[^>]*points="([^"]+)"[^>]*>/gi
    while ((m = polyRe.exec(svg)) !== null) {
      const isPolygon = m[1].toLowerCase() === "gon"
      const pts = m[2].trim().split(/[\s,]+/)
      if (pts.length >= 4) {
        const pairs: string[] = []
        for (let i = 0; i < pts.length - 1; i += 2) {
          pairs.push(`${pts[i]},${pts[i + 1]}`)
        }
        pathDs.push("M" + pairs.join("L") + (isPolygon ? "Z" : ""))
      }
    }

    // Extract rects (common in some icon sets)
    const rectRe = /<rect[^>]*>/gi
    while ((m = rectRe.exec(svg)) !== null) {
      const el = m[0]
      if (!isStroke && /fill\s*=\s*["']none["']/i.test(el)) continue
      const x = extractNumAttr(el, "x") ?? 0
      const y = extractNumAttr(el, "y") ?? 0
      const w = extractNumAttr(el, "width")
      const h = extractNumAttr(el, "height")
      if (w !== null && h !== null && (w > 1 || h > 1)) {
        const rx = extractNumAttr(el, "rx") ?? 0
        const ry = extractNumAttr(el, "ry") ?? rx
        if (rx > 0 || ry > 0) {
          pathDs.push(
            `M${x + rx},${y}h${w - 2 * rx}a${rx},${ry} 0 0 1 ${rx},${ry}v${h - 2 * ry}a${rx},${ry} 0 0 1 -${rx},${ry}h-${w - 2 * rx}a${rx},${ry} 0 0 1 -${rx},-${ry}v-${h - 2 * ry}a${rx},${ry} 0 0 1 ${rx},-${ry}z`
          )
        } else {
          pathDs.push(`M${x},${y}h${w}v${h}h-${w}z`)
        }
      }
    }

    if (pathDs.length === 0) return null

    return {
      icon: {
        viewBox,
        // For fill-based icons, joining paths is fine.
        // For stroke-based icons, keep individual paths separate so each
        // renders as its own <path> element with correct coordinate space.
        path: pathDs.join(" "),
        paths: isStroke ? pathDs : undefined,
        fillRule: undefined,
        isStroke,
        strokeWidth,
        strokeLinecap,
        strokeLinejoin,
      },
      defaultColor: "currentColor",
    }
  } catch {
    return null
  }
}

/** Extract a numeric attribute from an HTML element string. */
function extractNumAttr(el: string, name: string): number | null {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`)
  const m = el.match(re)
  if (!m) return null
  const n = parseFloat(m[1])
  return isNaN(n) ? null : n
}
