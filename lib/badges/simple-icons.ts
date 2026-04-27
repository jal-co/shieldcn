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
 * Look up an icon by slug. Supports SimpleIcons and React Icons.
 *
 * @param slug - "react" (SimpleIcons) or "ri:FaReact" (React Icons)
 * @param logoColor - optional override color
 */
export async function getSimpleIcon(
  slug: string,
  logoColor?: string
): Promise<{ icon: IconData; defaultColor: string } | null> {
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
        fillRule: undefined,
      },
      defaultColor: "currentColor",
    }
  } catch {
    return null
  }
}
