import type { Badge } from './shieldcn';
import { staticBadgePath } from './shieldcn';
import { matchBrand } from './brands';
import { proxyFetch, proxyHead } from './proxy-fetch';

export type InspectResult = {
  source: { owner: string; repo: string; url: string };
  badges: Badge[];
  notes: string[];
  existingShieldsIoUrls: string[];
};

type PackageJson = {
  name?: string;
  version?: string;
  private?: boolean;
  license?: string;
  type?: string;
  types?: string;
  typings?: string;
  bin?: unknown;
  sideEffects?: unknown;
  workspaces?: unknown;
  exports?: unknown;
  engines?: Record<string, string>;
  packageManager?: string;
  homepage?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const RAW = 'https://raw.githubusercontent.com';
const NPM = 'https://registry.npmjs.org';
const BRAND_CAP = 9;

// Probe list — runs client-side via parallel HEAD requests, so we can be
// generous (no Cloudflare subrequest limit applies). Common config-file
// variants are included to avoid false negatives.
const PROBE_FILES = [
  // Lockfiles
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
  'package-lock.json',
  // Container / runtime
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  '.nvmrc',
  // TS / lint / format
  'tsconfig.json',
  'biome.json',
  '.prettierrc',
  '.prettierrc.json',
  'prettier.config.js',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  'eslint.config.js',
  'eslint.config.mjs',
  // Bundler / framework
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mjs',
  'next.config.ts',
  'next.config.js',
  'next.config.mjs',
  'nuxt.config.ts',
  'nuxt.config.js',
  'astro.config.mjs',
  'astro.config.ts',
  'svelte.config.js',
  'svelte.config.ts',
  'tailwind.config.ts',
  'tailwind.config.js',
  'unocss.config.ts',
  'unocss.config.js',
  // Build / monorepo
  'turbo.json',
  'nx.json',
  '.changeset/README.md',
  '.storybook/main.ts',
  '.storybook/main.js',
  // Testing
  'vitest.config.ts',
  'vitest.config.js',
  'playwright.config.ts',
  'playwright.config.js',
  'jest.config.js',
  'jest.config.ts',
  'cypress.config.ts',
  'cypress.config.js',
  // Deployment
  'wrangler.toml',
  'wrangler.jsonc',
  'vercel.json',
  'netlify.toml',
  'fly.toml',
  // AI / modern signals
  'AGENTS.md',
  'llms.txt',
  '.claude/CLAUDE.md',
  '.cursor/rules',
  'mcp.json',
  'mcp-server.json',
] as const;

type ProbeKey = (typeof PROBE_FILES)[number];
type ProbeResult = Record<ProbeKey, boolean>;

function isAbort(e: unknown): boolean {
  return (
    e instanceof Error &&
    (e.name === 'AbortError' || (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError'))
  );
}

async function fetchText(url: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await proxyFetch(url, signal);
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    if (isAbort(e)) throw e;
    return null;
  }
}

async function fetchJson<T = unknown>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await proxyFetch(url, signal);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    if (isAbort(e)) throw e;
    return null;
  }
}

async function probeExists(url: string, signal?: AbortSignal): Promise<boolean> {
  try {
    return await proxyHead(url, signal);
  } catch (e) {
    if (isAbort(e)) throw e;
    return false;
  }
}

function rawUrl(owner: string, repo: string, path: string): string {
  return `${RAW}/${owner}/${repo}/HEAD/${path}`;
}

function parseGithubUrl(input: string):
  | { owner: string; repo: string; url: string }
  | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: 'URL is required' };

  const ownerRepoOnly = /^([\w.-]+)\/([\w.-]+)$/;
  const m1 = trimmed.match(ownerRepoOnly);
  if (m1) {
    const owner = m1[1]!;
    const repo = m1[2]!.replace(/\.git$/, '');
    return { owner, repo, url: `https://github.com/${owner}/${repo}` };
  }

  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (!/^github\.com$/i.test(u.hostname)) {
      return { error: 'URL must be a github.com repository' };
    }
    const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length < 2) return { error: 'Could not parse owner/repo from URL' };
    const owner = parts[0]!;
    const repo = parts[1]!.replace(/\.git$/, '');
    return { owner, repo, url: `https://github.com/${owner}/${repo}` };
  } catch {
    return { error: 'Invalid URL' };
  }
}

function extractDiscordInvite(readme: string): string | null {
  const re = /discord\.(?:gg|com\/invite)\/([a-zA-Z0-9-]+)/i;
  const m = readme.match(re);
  return m ? m[1]! : null;
}

function extractShieldsIoUrls(readme: string): string[] {
  const re = /https?:\/\/img\.shields\.io\/[^\s)"'>]+/g;
  return Array.from(new Set(readme.match(re) ?? []));
}

async function getPackageJson(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<PackageJson | null> {
  const raw = await fetchText(rawUrl(owner, repo, 'package.json'), signal);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

const README_CANDIDATES = ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README.markdown'] as const;

async function getReadme(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<string | null> {
  for (const path of README_CANDIDATES) {
    const text = await fetchText(rawUrl(owner, repo, path), signal);
    if (text) return text;
  }
  return null;
}

async function probeAllFiles(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<ProbeResult> {
  const entries = await Promise.all(
    PROBE_FILES.map(async (path) => {
      const exists = await probeExists(rawUrl(owner, repo, path), signal);
      return [path, exists] as const;
    }),
  );
  return Object.fromEntries(entries) as ProbeResult;
}

function githubMetricBadges(owner: string, repo: string): Badge[] {
  const mk = (
    id: string,
    label: string,
    path: string,
    query: Record<string, string> = {},
  ): Badge => ({
    id,
    group: 'github',
    label,
    path,
    query,
    overrides: {},
    enabled: true,
  });
  const p = (m: string) => `/github/${m}/${owner}/${repo}.svg`;
  return [
    mk('github.stars', 'GitHub Stars', p('stars'), { variant: 'secondary' }),
    mk('github.forks', 'GitHub Forks', p('forks'), { variant: 'secondary' }),
    mk('github.watchers', 'Watchers', p('watchers'), { variant: 'secondary' }),
    mk('github.branches', 'Branches', p('branches'), { variant: 'ghost' }),
    mk('github.contributors', 'Contributors', p('contributors'), {
      theme: 'emerald',
    }),
    mk('github.last-commit', 'Last commit', p('last-commit'), {
      variant: 'secondary',
    }),
    mk('github.commits', 'Commits', p('commits'), { variant: 'secondary' }),
    mk('github.open-issues', 'Open issues', p('open-issues'), {
      variant: 'secondary',
    }),
    mk('github.closed-issues', 'Closed issues', p('closed-issues'), {
      variant: 'ghost',
    }),
    mk('github.open-prs', 'Open PRs', p('open-prs'), { variant: 'secondary' }),
    mk('github.closed-prs', 'Closed PRs', p('closed-prs'), { variant: 'ghost' }),
    mk('github.merged-prs', 'Merged PRs', p('merged-prs'), { variant: 'ghost' }),
    mk('github.release', 'Release', p('release')),
    mk('github.ci', 'CI', p('ci'), { variant: 'secondary' }),
    mk('github.license', 'License', p('license'), { variant: 'ghost' }),
  ];
}

function npmBadges(pkg: string): Badge[] {
  const mk = (
    id: string,
    label: string,
    path: string,
    query: Record<string, string> = {},
  ): Badge => ({
    id,
    group: 'package',
    label,
    path,
    query,
    overrides: {},
    enabled: true,
  });
  return [
    mk('npm.version', 'npm Version', `/npm/${pkg}.svg`, { variant: 'secondary' }),
    mk('npm.dw', 'npm Weekly Downloads', `/npm/dw/${pkg}.svg`),
    mk('npm.dm', 'npm Monthly Downloads', `/npm/dm/${pkg}.svg`, {
      variant: 'ghost',
    }),
    mk('npm.dt', 'npm Total Downloads', `/npm/dt/${pkg}.svg`, {
      variant: 'secondary',
    }),
    mk('npm.dependents', 'npm Dependents', `/npm/dependents/${pkg}.svg`, {
      variant: 'secondary',
    }),
    mk('npm.types', 'npm Types', `/npm/types/${pkg}.svg`, { theme: 'blue' }),
    mk('npm.node', 'npm Node', `/npm/node/${pkg}.svg`, { variant: 'secondary' }),
    mk('npm.license', 'npm License', `/npm/license/${pkg}.svg`, {
      variant: 'ghost',
    }),
  ];
}

function privatePackageBadge(): Badge {
  return {
    id: 'package.private',
    group: 'package',
    label: 'Private package',
    path: staticBadgePath('Private', 'package', 'red'),
    query: { variant: 'secondary' },
    overrides: {},
    enabled: true,
  };
}

type ToolingRule = {
  id: string;
  category: string;
  name: string;
  slug: string;
  color: string;
  requires: ProbeKey[];
};

const TOOLING_RULES: ToolingRule[] = [
  // Package managers
  { id: 'tooling.pnpm', category: 'Package mgr', name: 'pnpm', slug: 'pnpm', color: 'F69220', requires: ['pnpm-lock.yaml'] },
  { id: 'tooling.bun', category: 'Package mgr', name: 'Bun', slug: 'bun', color: '000000', requires: ['bun.lock', 'bun.lockb'] },
  { id: 'tooling.yarn', category: 'Package mgr', name: 'Yarn', slug: 'yarn', color: '2C8EBB', requires: ['yarn.lock'] },
  { id: 'tooling.npm', category: 'Package mgr', name: 'npm', slug: 'npm', color: 'CB3837', requires: ['package-lock.json'] },
  // Container
  { id: 'tooling.docker', category: 'Container', name: 'Docker', slug: 'docker', color: '2496ED', requires: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'] },
  // Language / lint / format
  { id: 'tooling.typescript', category: 'Language', name: 'TypeScript', slug: 'typescript', color: '3178C6', requires: ['tsconfig.json'] },
  { id: 'tooling.biome', category: 'Lint', name: 'Biome', slug: 'biome', color: '60A5FA', requires: ['biome.json'] },
  { id: 'tooling.eslint', category: 'Lint', name: 'ESLint', slug: 'eslint', color: '4B32C3', requires: ['.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs', 'eslint.config.js', 'eslint.config.mjs'] },
  { id: 'tooling.prettier', category: 'Format', name: 'Prettier', slug: 'prettier', color: 'F7B93E', requires: ['.prettierrc', '.prettierrc.json', 'prettier.config.js'] },
  // Frameworks / bundlers
  { id: 'tooling.vite', category: 'Bundler', name: 'Vite', slug: 'vite', color: '646CFF', requires: ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'] },
  { id: 'tooling.nextjs', category: 'Framework', name: 'Next.js', slug: 'nextdotjs', color: '000000', requires: ['next.config.ts', 'next.config.js', 'next.config.mjs'] },
  { id: 'tooling.nuxt', category: 'Framework', name: 'Nuxt', slug: 'nuxt', color: '00DC82', requires: ['nuxt.config.ts', 'nuxt.config.js'] },
  { id: 'tooling.astro', category: 'Framework', name: 'Astro', slug: 'astro', color: 'BC52EE', requires: ['astro.config.mjs', 'astro.config.ts'] },
  { id: 'tooling.svelte', category: 'Framework', name: 'Svelte', slug: 'svelte', color: 'FF3E00', requires: ['svelte.config.js', 'svelte.config.ts'] },
  { id: 'tooling.tailwind', category: 'CSS', name: 'Tailwind', slug: 'tailwindcss', color: '06B6D4', requires: ['tailwind.config.ts', 'tailwind.config.js'] },
  { id: 'tooling.unocss', category: 'CSS', name: 'UnoCSS', slug: 'unocss', color: '333333', requires: ['unocss.config.ts', 'unocss.config.js'] },
  // Monorepo / build
  { id: 'tooling.turbo', category: 'Monorepo', name: 'Turborepo', slug: 'turborepo', color: 'EF4444', requires: ['turbo.json'] },
  { id: 'tooling.nx', category: 'Monorepo', name: 'Nx', slug: 'nx', color: '143055', requires: ['nx.json'] },
  { id: 'tooling.changesets', category: 'Releases', name: 'Changesets', slug: 'changesets', color: '5846F5', requires: ['.changeset/README.md'] },
  { id: 'tooling.storybook', category: 'Docs', name: 'Storybook', slug: 'storybook', color: 'FF4785', requires: ['.storybook/main.ts', '.storybook/main.js'] },
  // Tests
  { id: 'tooling.vitest', category: 'Tests', name: 'Vitest', slug: 'vitest', color: '6E9F18', requires: ['vitest.config.ts', 'vitest.config.js'] },
  { id: 'tooling.playwright', category: 'Tests', name: 'Playwright', slug: 'playwright', color: '2EAD33', requires: ['playwright.config.ts', 'playwright.config.js'] },
  { id: 'tooling.jest', category: 'Tests', name: 'Jest', slug: 'jest', color: 'C21325', requires: ['jest.config.js', 'jest.config.ts'] },
  { id: 'tooling.cypress', category: 'Tests', name: 'Cypress', slug: 'cypress', color: '69D3A7', requires: ['cypress.config.ts', 'cypress.config.js'] },
  // Hosting
  { id: 'tooling.cloudflare', category: 'Hosting', name: 'Cloudflare Workers', slug: 'cloudflare', color: 'F38020', requires: ['wrangler.toml', 'wrangler.jsonc'] },
  { id: 'tooling.vercel', category: 'Hosting', name: 'Vercel', slug: 'vercel', color: '000000', requires: ['vercel.json'] },
  { id: 'tooling.netlify', category: 'Hosting', name: 'Netlify', slug: 'netlify', color: '00AD9F', requires: ['netlify.toml'] },
  { id: 'tooling.fly', category: 'Hosting', name: 'Fly.io', slug: 'flydotio', color: '24175B', requires: ['fly.toml'] },
];

function toolingBadges(probes: ProbeResult): Badge[] {
  const found: Badge[] = [];
  const seenSlugs = new Set<string>();
  for (const rule of TOOLING_RULES) {
    if (!rule.requires.some((f) => probes[f])) continue;
    if (seenSlugs.has(rule.slug)) continue;
    seenSlugs.add(rule.slug);
    found.push({
      id: rule.id,
      group: 'tooling',
      label: `${rule.category} · ${rule.name}`,
      path: staticBadgePath(rule.category, rule.name, rule.color),
      query: { logo: rule.slug, variant: 'branded' },
      overrides: {},
      enabled: true,
    });
  }
  return found;
}

function stackBadges(pkg: PackageJson, toolingSlugs: Set<string>): Badge[] {
  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };
  const out: Badge[] = [];
  const seen = new Set<string>();
  for (const name of Object.keys(deps)) {
    const brand = matchBrand(name);
    if (!brand) continue;
    if (toolingSlugs.has(brand.slug)) continue;
    if (seen.has(brand.slug)) continue;
    seen.add(brand.slug);
    out.push({
      id: `stack.${brand.slug}`,
      group: 'stack',
      label: brand.label,
      path: staticBadgePath('Stack', brand.label, brand.color),
      query: { logo: brand.slug, variant: 'branded' },
      overrides: {},
      enabled: true,
    });
    if (out.length >= BRAND_CAP) break;
  }
  return out;
}

function modernBadges(pkg: PackageJson, probes: ProbeResult): Badge[] {
  const out: Badge[] = [];

  const add = (
    id: string,
    label: string,
    message: string,
    color: string,
    variant = 'secondary',
  ) =>
    out.push({
      id,
      group: 'modern',
      label: `${label} ${message}`.trim(),
      path: staticBadgePath(label, message, color),
      query: { variant },
      overrides: {},
      enabled: true,
    });

  if (pkg.type === 'module') add('modern.esm', 'ESM', 'only', '16a34a');

  if (pkg.sideEffects === false) add('modern.tree-shakeable', 'Tree-shakeable', 'yes', '16a34a');

  if (pkg.bin) add('modern.cli', 'CLI', 'tool', '7c3aed');

  if (pkg.workspaces) add('modern.monorepo', 'Monorepo', 'yes', '2563eb');

  if (pkg.exports && typeof pkg.exports === 'object') {
    const serialized = JSON.stringify(pkg.exports);
    if (serialized.includes('import') && serialized.includes('require')) {
      add('modern.dual-package', 'Dual package', 'ESM+CJS', '2563eb');
    }
  }

  if (probes['AGENTS.md']) add('modern.agents-md', 'Agent-friendly', 'AGENTS.md', 'D97757');
  if (probes['llms.txt']) add('modern.llms-txt', 'LLM-indexed', 'llms.txt', '7C3AED');
  if (probes['.claude/CLAUDE.md']) add('modern.claude', 'Claude Code', 'ready', 'D97757');
  if (probes['.cursor/rules']) add('modern.cursor', 'Cursor', 'ready', '000000');
  if (probes['mcp.json']) add('modern.mcp', 'MCP', 'server', '111827');

  return out;
}

async function communityBadges(
  owner: string,
  repo: string,
  pkg: PackageJson | null,
  readme: string | null,
  signal?: AbortSignal,
): Promise<Badge[]> {
  const out: Badge[] = [];
  if (readme) {
    const code = extractDiscordInvite(readme);
    if (code) {
      out.push({
        id: 'community.discord-members',
        group: 'community',
        label: 'Discord Members',
        path: `/discord/members/${code}.svg`,
        query: { variant: 'secondary' },
        overrides: {},
        enabled: true,
      });
      out.push({
        id: 'community.discord-online',
        group: 'community',
        label: 'Discord Online',
        path: `/discord/online-members/${code}.svg`,
        query: { variant: 'branded' },
        overrides: {},
        enabled: true,
      });
    }
  }

  const fundingText = await fetchText(rawUrl(owner, repo, '.github/FUNDING.yml'), signal);
  if (fundingText) {
    let data: Record<string, unknown> | null = null;
    try {
      const { parse: parseYaml } = await import('yaml');
      data = parseYaml(fundingText) as Record<string, unknown>;
    } catch {
      data = null;
    }
    if (data) {
      if (data.github) {
        out.push({
          id: 'community.sponsor-github',
          group: 'community',
          label: 'GitHub Sponsors',
          path: staticBadgePath('Sponsor', 'GitHub', 'ea4aaa'),
          query: { logo: 'githubsponsors', variant: 'secondary' },
          overrides: {},
          enabled: true,
        });
      }
      if (data.open_collective) {
        out.push({
          id: 'community.sponsor-opencollective',
          group: 'community',
          label: 'Open Collective',
          path: staticBadgePath('Open Collective', 'sponsor', '7FADF2'),
          query: { logo: 'opencollective', variant: 'secondary' },
          overrides: {},
          enabled: true,
        });
      }
      if (data.patreon) {
        out.push({
          id: 'community.sponsor-patreon',
          group: 'community',
          label: 'Patreon',
          path: staticBadgePath('Patreon', 'sponsor', 'FF424D'),
          query: { logo: 'patreon', variant: 'secondary' },
          overrides: {},
          enabled: true,
        });
      }
      if (data.ko_fi) {
        out.push({
          id: 'community.sponsor-kofi',
          group: 'community',
          label: 'Ko-fi',
          path: staticBadgePath('Ko-fi', 'sponsor', 'FF5E5B'),
          query: { logo: 'kofi', variant: 'secondary' },
          overrides: {},
          enabled: true,
        });
      }
    }
  }

  if (pkg?.homepage && /^https?:\/\//.test(pkg.homepage)) {
    out.push({
      id: 'community.homepage',
      group: 'community',
      label: 'Homepage',
      path: staticBadgePath('Homepage', 'link', '2563eb'),
      query: { variant: 'ghost' },
      overrides: {},
      enabled: true,
      linkUrl: pkg.homepage,
    });
  }

  return out;
}

export async function inspect(
  urlOrSlug: string,
  externalSignal?: AbortSignal,
): Promise<InspectResult | { error: string }> {
  const parsed = parseGithubUrl(urlOrSlug);
  if ('error' in parsed) return { error: parsed.error };
  const { owner, repo, url } = parsed;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), 15_000);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason));
  }
  const signal = controller.signal;

  try {
    const [pkg, readme, probes] = await Promise.all([
      getPackageJson(owner, repo, signal),
      getReadme(owner, repo, signal),
      probeAllFiles(owner, repo, signal),
    ]);

    const notes: string[] = [];
    const badges: Badge[] = [];

    badges.push(...githubMetricBadges(owner, repo));

    if (pkg) {
      if (pkg.private === true) {
        badges.push(privatePackageBadge());
        notes.push('package.json is private — npm badges suppressed.');
      } else if (pkg.name) {
        // npm registry accepts both `react` and `@scope/name` directly without encoding
        const npmInfo = await fetchJson<{ name?: string }>(
          `${NPM}/${pkg.name}`,
          signal,
        );
        if (npmInfo && npmInfo.name) {
          badges.push(...npmBadges(pkg.name));
        } else {
          notes.push(`Package "${pkg.name}" not found on npm — npm badges skipped.`);
        }
      }
    } else {
      notes.push('No package.json detected — npm badges skipped.');
    }

    const toolBadges = toolingBadges(probes);
    const toolingSlugs = new Set(
      toolBadges.map((b) => b.query.logo).filter((v): v is string => !!v),
    );
    badges.push(...toolBadges);

    if (pkg) {
      badges.push(...stackBadges(pkg, toolingSlugs));
      badges.push(...modernBadges(pkg, probes));
    } else {
      // package.json missing — only emit probe-based modern badges
      badges.push(...modernBadges({}, probes));
    }

    badges.push(...(await communityBadges(owner, repo, pkg, readme, signal)));

    const existingShieldsIoUrls = readme ? extractShieldsIoUrls(readme) : [];

    return { source: { owner, repo, url }, badges, notes, existingShieldsIoUrls };
  } catch (e) {
    if (isAbort(e)) {
      return { error: signal.reason?.message ?? 'Request was cancelled' };
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export { parseGithubUrl };
