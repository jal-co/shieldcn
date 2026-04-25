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
};

export const DEFAULT_GLOBAL: GlobalSettings = {
  variant: 'default',
  size: 'sm',
  mode: 'dark',
  theme: 'none',
};

export type BadgeGroup =
  | 'github'
  | 'package'
  | 'stack'
  | 'tooling'
  | 'modern'
  | 'community';

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
): Record<string, string> {
  const merged: Record<string, string> = { ...badge.query };

  if (global.variant !== 'default' && !merged.variant) merged.variant = global.variant;
  if (global.size !== 'default' && !merged.size) merged.size = global.size;
  if (global.mode !== 'dark' && !merged.mode) merged.mode = global.mode;
  if (global.theme !== 'none' && !merged.theme) merged.theme = global.theme;

  for (const [rawKey, rawVal] of Object.entries(badge.overrides)) {
    if (rawVal === undefined || rawVal === null || rawVal === '') continue;
    const key = rawKey as keyof Overrides;
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

export function badgeUrl(badge: Badge, global: GlobalSettings): string {
  const qs = new URLSearchParams(mergeQuery(badge, global)).toString();
  return `${SHIELDCN_BASE}${badge.path}${qs ? `?${qs}` : ''}`;
}

export function badgeMarkdown(badge: Badge, global: GlobalSettings): string {
  const url = badgeUrl(badge, global);
  const alt = badge.label.replace(/[\[\]]/g, '');
  const img = `![${alt}](${url})`;
  return badge.linkUrl ? `[${img}](${badge.linkUrl})` : img;
}

export function badgeHtml(badge: Badge, global: GlobalSettings): string {
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
