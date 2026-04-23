/**
 * shieldcn
 * lib/badges/simple-icons
 *
 * Icon resolution for badges. Supports:
 * - SimpleIcons slugs: ?logo=react, ?logo=typescript
 * - Lucide icons: ?logo=lucide:star, ?logo=lucide:github
 *
 * Returns SVG path data for inline rendering in badge SVGs.
 */

import type { IconData } from "./icons"

/**
 * Look up an icon by slug. Supports SimpleIcons and Lucide.
 *
 * @param slug - "react" (SimpleIcons) or "lucide:star" (Lucide)
 * @param logoColor - optional override color
 */
export async function getSimpleIcon(
  slug: string,
  logoColor?: string
): Promise<{ icon: IconData; defaultColor: string } | null> {
  // Lucide icons: ?logo=lucide:icon-name
  if (slug.startsWith("lucide:")) {
    return getLucideIcon(slug.slice(7))
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
 * Look up a Lucide icon by name.
 *
 * Lucide icons are stroke-based SVGs. We extract all `d` attributes from
 * path/circle/line/polyline/rect elements and combine them into a single
 * compound path string that Satori can render as a single <path> element.
 *
 * Since Lucide icons are stroke-based (not filled), we mark them with
 * fillRule="__lucide__" so the renderer can apply stroke instead of fill.
 */
async function getLucideIcon(
  name: string
): Promise<{ icon: IconData; defaultColor: string } | null> {
  try {
    const pascalName = name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("")

    const lucide = await import("lucide-static")
    const svgString = (lucide as unknown as Record<string, string>)[pascalName]

    if (!svgString) return null

    // Extract all d="..." attributes from path elements
    const pathDs: string[] = []
    const pathRegex = /d="([^"]+)"/g
    let match: RegExpExecArray | null
    while ((match = pathRegex.exec(svgString)) !== null) {
      pathDs.push(match[1])
    }

    // Also handle <circle cx="X" cy="Y" r="R" /> → convert to path
    const circleRegex = /<circle\s+cx="([^"]+)"\s+cy="([^"]+)"\s+r="([^"]+)"/g
    while ((match = circleRegex.exec(svgString)) !== null) {
      const cx = parseFloat(match[1])
      const cy = parseFloat(match[2])
      const r = parseFloat(match[3])
      // Circle as two arcs
      pathDs.push(`M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 -${r * 2},0`)
    }

    // Also handle <line x1 y1 x2 y2 />
    const lineRegex = /<line\s+x1="([^"]+)"\s+y1="([^"]+)"\s+x2="([^"]+)"\s+y2="([^"]+)"/g
    while ((match = lineRegex.exec(svgString)) !== null) {
      pathDs.push(`M${match[1]},${match[2]}L${match[3]},${match[4]}`)
    }

    // Also handle <polyline points="..." />
    const polylineRegex = /points="([^"]+)"/g
    while ((match = polylineRegex.exec(svgString)) !== null) {
      const pts = match[1].trim().split(/\s+/)
      if (pts.length >= 2) {
        pathDs.push("M" + pts.join("L"))
      }
    }

    if (pathDs.length === 0) return null

    // Combine all paths into one compound path
    const combinedPath = pathDs.join(" ")

    return {
      icon: {
        viewBox: "0 0 24 24",
        path: combinedPath,
        fillRule: "__lucide__",
      },
      defaultColor: "currentColor",
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

    // Check if it's stroke-based (like Feather icons via react-icons/fi)
    const isStroke = svg.includes('fill="none"') && svg.includes('stroke="currentColor"')

    // Extract path d attributes, skipping bounding-box paths (fill="none" rects)
    const pathDs: string[] = []
    // Match <path ...d="..."> but skip paths with fill="none"
    const pathElRe = /<path[^>]*>/g
    let m: RegExpExecArray | null
    while ((m = pathElRe.exec(svg)) !== null) {
      const el = m[0]
      // Skip bounding box paths (fill="none" or d is just a rectangle)
      if (el.includes('fill="none"')) continue
      const dMatch = el.match(/d="([^"]+)"/) 
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
      pathDs.push(`M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 -${r * 2},0`)
    }

    // Extract lines
    const lineRe = /<line[^>]*x1="([^"]+)"[^>]*y1="([^"]+)"[^>]*x2="([^"]+)"[^>]*y2="([^"]+)"/g
    while ((m = lineRe.exec(svg)) !== null) {
      pathDs.push(`M${m[1]},${m[2]}L${m[3]},${m[4]}`)
    }

    if (pathDs.length === 0) return null

    return {
      icon: {
        viewBox,
        path: pathDs.join(" "),
        // Stroke-based icons (Feather/fi) use __lucide__ marker for stroke rendering
        fillRule: isStroke ? "__lucide__" : undefined,
      },
      defaultColor: "currentColor",
    }
  } catch {
    return null
  }
}
