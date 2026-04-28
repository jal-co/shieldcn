import type { Badge, BadgeGroup, GlobalSettings } from './shieldcn';
import { DEFAULT_GLOBAL } from './shieldcn';

export type RepoSource = { type: 'github'; url: string; owner: string; repo: string };
export type ProfileSource = { type: 'profile'; url: string; username: string };
export type ConfigSource = RepoSource | ProfileSource;

export type Config = {
  version: 1;
  source: ConfigSource;
  global: GlobalSettings;
  badges: Badge[];
  generatedAt: string;
};

const VALID_GROUPS: BadgeGroup[] = [
  'github',
  'package',
  'tooling',
  'stack',
  'modern',
  'community',
  'profile',
  'social',
  'skills',
  'repos',
];

export function serialize(config: Config): string {
  return JSON.stringify(config, null, 2);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function safeLinkUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : undefined;
  } catch {
    return undefined;
  }
}

function validateBadge(raw: unknown): Badge | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.label !== 'string') return null;
  if (typeof raw.path !== 'string' || !raw.path.startsWith('/')) return null;
  if (!VALID_GROUPS.includes(raw.group as BadgeGroup)) return null;
  const query = isPlainObject(raw.query) ? raw.query : {};
  const overrides = isPlainObject(raw.overrides) ? raw.overrides : {};
  // Strip any non-string query values defensively.
  const safeQuery: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (typeof v === 'string') safeQuery[k] = v;
  }
  return {
    id: raw.id,
    group: raw.group as BadgeGroup,
    label: raw.label,
    path: raw.path,
    query: safeQuery,
    overrides: overrides as Badge['overrides'],
    enabled: raw.enabled !== false,
    linkUrl: safeLinkUrl(raw.linkUrl),
  };
}

export function deserialize(raw: string):
  | { ok: true; config: Config }
  | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `Not valid JSON: ${(e as Error).message}` };
  }
  if (!isPlainObject(parsed)) {
    return { ok: false, error: 'JSON must be an object' };
  }
  if (parsed.version !== 1) {
    return { ok: false, error: `Unsupported config version: ${parsed.version ?? 'missing'}` };
  }
  const source = parsed.source as Record<string, unknown> | undefined;
  if (!isPlainObject(source)) {
    return { ok: false, error: 'Missing source object' };
  }
  // Profile sources need username, repo sources need owner/repo
  if (source.type === 'profile') {
    if (typeof source.username !== 'string') {
      return { ok: false, error: 'Missing source.username for profile config' };
    }
  } else {
    if (typeof source.owner !== 'string' || typeof source.repo !== 'string') {
      return { ok: false, error: 'Missing source.owner / source.repo' };
    }
  }
  if (!Array.isArray(parsed.badges)) {
    return { ok: false, error: 'badges must be an array' };
  }

  const badges: Badge[] = [];
  let droppedCount = 0;
  for (const raw of parsed.badges) {
    const valid = validateBadge(raw);
    if (valid) badges.push(valid);
    else droppedCount++;
  }

  const sourceType = source.type === 'profile' ? 'profile' : 'github';
  const sOwner = typeof source.owner === 'string' ? source.owner : '';
  const sRepo = typeof source.repo === 'string' ? source.repo : '';
  const sUsername = typeof source.username === 'string' ? source.username : sOwner;
  const safeUrl = typeof source.url === 'string'
    ? safeLinkUrl(source.url) ?? `https://github.com/${sOwner || sUsername}`
    : `https://github.com/${sOwner || sUsername}`;

  const resolvedSource: Config['source'] = sourceType === 'profile'
    ? { type: 'profile', username: sUsername, url: safeUrl }
    : { type: 'github', owner: sOwner, repo: sRepo, url: safeUrl };

  const config: Config = {
    version: 1,
    source: resolvedSource,
    global: { ...DEFAULT_GLOBAL, ...(isPlainObject(parsed.global) ? parsed.global : {}) },
    badges,
    generatedAt:
      typeof parsed.generatedAt === 'string' ? parsed.generatedAt : new Date().toISOString(),
  };

  if (droppedCount > 0) {
    // Surface as a soft warning but still load — best-effort.
    console.warn(`[shieldcngen] Dropped ${droppedCount} malformed badge(s) from config`);
  }

  return { ok: true, config };
}

/**
 * Merge freshly-detected badges into a saved config.
 * - Existing IDs: keep the user's `enabled` and `overrides`; refresh `path` / `query` / `label` from fresh.
 * - New IDs: add with enabled: true.
 * - Saved enabled-true badges not in fresh results: kept as-is (user can delete manually).
 * - Saved enabled-false badges not in fresh results: dropped (no longer detected and user didn't want them anyway).
 */
export function mergeRefresh(
  saved: Config,
  fresh: { badges: Badge[]; source: ConfigSource },
): { config: Config; diff: { added: string[]; refreshed: string[]; missing: string[] } } {
  const freshMap = new Map(fresh.badges.map((b) => [b.id, b]));
  const savedMap = new Map(saved.badges.map((b) => [b.id, b]));

  const added: string[] = [];
  const refreshed: string[] = [];
  const missing: string[] = [];

  const resultBadges: Badge[] = [];

  for (const freshBadge of fresh.badges) {
    const prior = savedMap.get(freshBadge.id);
    if (prior) {
      resultBadges.push({
        ...freshBadge,
        enabled: prior.enabled,
        overrides: prior.overrides,
      });
      refreshed.push(freshBadge.id);
    } else {
      resultBadges.push(freshBadge);
      added.push(freshBadge.id);
    }
  }

  for (const [id, savedBadge] of savedMap) {
    if (freshMap.has(id)) continue;
    if (savedBadge.enabled) {
      resultBadges.push(savedBadge);
      missing.push(id);
    }
  }

  return {
    config: {
      ...saved,
      source: fresh.source,
      badges: resultBadges,
      generatedAt: new Date().toISOString(),
    },
    diff: { added, refreshed, missing },
  };
}
