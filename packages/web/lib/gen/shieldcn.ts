export const SHIELDCN_BASE = 'https://www.shieldcn.dev';

export type Variant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'branded';

export type Size = 'xs' | 'sm' | 'default' | 'lg';

export type Mode = 'dark' | 'light';

export type Font =
  | 'inter'
  | 'geist'
  | 'geist-mono'
  | 'jetbrains-mono'
  | 'fira-code'
  | 'roboto'
  | 'space-grotesk';

export type Theme =
  | 'none'
  | 'zinc'
  | 'slate'
  | 'stone'
  | 'neutral'
  | 'gray'
  | 'blue'
  | 'green'
  | 'rose'
  | 'orange'
  | 'amber'
  | 'violet'
  | 'purple'
  | 'red'
  | 'cyan'
  | 'emerald';

export type Overrides = Partial<{
  variant: Variant;
  size: Size;
  mode: Mode;
  theme: Theme;
  font: Font;
  color: string;
  labelColor: string;
  valueColor: string;
  labelTextColor: string;
  labelOpacity: number;
  logo: string | false;
  logoColor: string;
  label: string;
  split: boolean;
  statusDot: boolean;
  height: number;
  fontSize: number;
  radius: number;
  padX: number;
  iconSize: number;
  gap: number;
  labelGap: number;
}>;

export type GlobalSettings = {
  variant: Variant;
  size: Size;
  mode: Mode;
  theme: Theme;
  font: Font;
  /**
   * Emit theme-aware <picture> markup so badges adapt to the viewer's
   * GitHub light/dark theme. Only affects theme-derived variants without an
   * explicit color (see isThemeAdaptive).
   */
  themeAware?: boolean;
};

export const DEFAULT_GLOBAL: GlobalSettings = {
  variant: 'default',
  size: 'sm',
  mode: 'dark',
  theme: 'none',
  font: 'inter',
  themeAware: false,
};

export type BadgeGroup =
  | 'github'
  | 'package'
  | 'stack'
  | 'tooling'
  | 'modern'
  | 'community'
  | 'profile'
  | 'social'
  | 'skills'
  | 'repos';

export type Badge = {
  id: string;
  group: BadgeGroup;
  label: string;
  path: string;
  query: Record<string, string>;
  overrides: Overrides;
  enabled: boolean;
  linkUrl?: string;
};

function stripHash(v: string): string {
  return v.startsWith('#') ? v.slice(1) : v;
}

const COLOR_FIELDS: (keyof Overrides)[] = [
  'color',
  'labelColor',
  'valueColor',
  'labelTextColor',
  'logoColor',
];

export function mergeQuery(
  badge: Badge,
  global: GlobalSettings,
  modeOverride?: Mode,
): Record<string, string> {
  const merged: Record<string, string> = { ...badge.query };

  if (global.variant !== 'default' && !merged.variant) merged.variant = global.variant;
  if (global.size !== 'default' && !merged.size) merged.size = global.size;
  if (modeOverride) merged.mode = modeOverride;
  else if (global.mode !== 'dark' && !merged.mode) merged.mode = global.mode;
  if (global.theme !== 'none' && !merged.theme) merged.theme = global.theme;
  if (global.font !== 'inter' && !merged.font) merged.font = global.font;

  for (const [rawKey, rawVal] of Object.entries(badge.overrides)) {
    if (rawVal === undefined || rawVal === null || rawVal === '') continue;
    const key = rawKey as keyof Overrides;
    // A forced mode (for theme-aware <picture> output) must win over the
    // badge's own mode override, otherwise both <source> and <img> resolve
    // to the same mode and the <picture> swap does nothing.
    if (key === 'mode' && modeOverride) continue;
    if (key === 'theme' && rawVal === 'none') {
      delete merged.theme;
      continue;
    }
    let value: string;
    if (typeof rawVal === 'boolean') {
      value = rawVal ? 'true' : 'false';
    } else if (typeof rawVal === 'number') {
      value = String(rawVal);
    } else {
      value = String(rawVal);
    }
    if (COLOR_FIELDS.includes(key)) value = stripHash(value);
    merged[key] = value;
  }

  return merged;
}

export function badgeUrl(
  badge: Badge,
  global: GlobalSettings,
  modeOverride?: Mode,
): string {
  const qs = new URLSearchParams(mergeQuery(badge, global, modeOverride)).toString();
  return `${SHIELDCN_BASE}${badge.path}${qs ? `?${qs}` : ''}`;
}

/**
 * Variants whose colors are derived from the light/dark theme. Only these
 * benefit from theme-aware <picture> output — a badge with an explicit color
 * looks identical in both modes.
 */
const THEME_DERIVED_VARIANTS = new Set<string>([
  'default',
  'secondary',
  'outline',
  'ghost',
  'branded',
]);

/**
 * Whether a badge would actually change between light and dark mode, so it's
 * worth wrapping in <picture>. True when the resolved variant is theme-derived
 * and the badge has no explicit color override pinning it to one look.
 */
export function isThemeAdaptive(badge: Badge, global: GlobalSettings): boolean {
  const variant =
    badge.query.variant ||
    (global.variant !== 'default' ? global.variant : 'default');
  if (!THEME_DERIVED_VARIANTS.has(variant)) return false;
  // An explicit color (query or override) locks the badge to one appearance.
  if (badge.query.color) return false;
  if (badge.overrides.color) return false;
  // An explicit mode pins the badge to one theme, so <picture> is pointless.
  if (badge.query.mode) return false;
  if (badge.overrides.mode) return false;
  return true;
}

/**
 * Build a GitHub theme-aware <picture> element. The <source> targets dark-theme
 * viewers; the <img> fallback (light) covers light-theme viewers and renderers
 * that don't support <picture> (npm, PyPI, etc).
 */
export function badgePicture(badge: Badge, global: GlobalSettings): string {
  const dark = badgeUrl(badge, global, 'dark');
  const light = badgeUrl(badge, global, 'light');
  const alt = badge.label.replace(/"/g, '&quot;');
  const pic =
    `<picture>` +
    `<source media="(prefers-color-scheme: dark)" srcset="${dark}">` +
    `<img alt="${alt}" src="${light}"></picture>`;
  return badge.linkUrl ? `<a href="${badge.linkUrl}">${pic}</a>` : pic;
}

export function badgeMarkdown(badge: Badge, global: GlobalSettings): string {
  if (global.themeAware && isThemeAdaptive(badge, global)) {
    return badgePicture(badge, global);
  }
  const url = badgeUrl(badge, global);
  const alt = badge.label.replace(/[\[\]]/g, '');
  const img = `![${alt}](${url})`;
  return badge.linkUrl ? `[${img}](${badge.linkUrl})` : img;
}

export function badgeHtml(badge: Badge, global: GlobalSettings): string {
  if (global.themeAware && isThemeAdaptive(badge, global)) {
    return badgePicture(badge, global);
  }
  const url = badgeUrl(badge, global);
  const alt = badge.label.replace(/"/g, '&quot;');
  const img = `<img src="${url}" alt="${alt}" />`;
  return badge.linkUrl ? `<a href="${badge.linkUrl}">${img}</a>` : img;
}

const ENCODE_MAP: Array<[RegExp, string]> = [
  [/_/g, '__'],
  [/-/g, '--'],
];

export function encodeStaticSegment(raw: string): string {
  let s = raw;
  for (const [re, rep] of ENCODE_MAP) s = s.replace(re, rep);
  return s.replace(/ /g, '_');
}

export function staticBadgePath(
  label: string,
  message: string,
  color: string,
): string {
  const enc = (s: string) => encodeURIComponent(encodeStaticSegment(s));
  return `/badge/${enc(label)}-${enc(message)}-${stripHash(color)}.svg`;
}
