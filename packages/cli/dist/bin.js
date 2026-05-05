#!/usr/bin/env node

// src/bin.ts
import { defineCommand, runMain } from "citty";
import consola from "consola";
import pc from "picocolors";
import { readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "fs";
import { resolve as resolve2 } from "path";
import { execSync } from "child_process";

// src/detect.ts
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

// src/brands.ts
var BRANDS = {
  // React ecosystem
  react: { slug: "react", color: "61DAFB", label: "React" },
  "react-dom": { slug: "react", color: "61DAFB", label: "React" },
  next: { slug: "nextdotjs", color: "000000", label: "Next.js" },
  "@next/env": { slug: "nextdotjs", color: "000000", label: "Next.js" },
  "@t3-oss/env-nextjs": { slug: "nextdotjs", color: "000000", label: "Next.js" },
  astro: { slug: "astro", color: "BC52EE", label: "Astro" },
  "@astrojs/cloudflare": { slug: "astro", color: "BC52EE", label: "Astro" },
  svelte: { slug: "svelte", color: "FF3E00", label: "Svelte" },
  "@sveltejs/kit": { slug: "svelte", color: "FF3E00", label: "SvelteKit" },
  vue: { slug: "vuedotjs", color: "4FC08D", label: "Vue" },
  nuxt: { slug: "nuxt", color: "00DC82", label: "Nuxt" },
  "solid-js": { slug: "solid", color: "2C4F7C", label: "Solid" },
  "@builder.io/qwik": { slug: "qwik", color: "18B6F6", label: "Qwik" },
  // CSS / UI
  tailwindcss: { slug: "tailwindcss", color: "06B6D4", label: "Tailwind CSS" },
  unocss: { slug: "unocss", color: "333333", label: "UnoCSS" },
  "@radix-ui/react": { slug: "radixui", color: "000000", label: "Radix UI" },
  "@shadcn/ui": { slug: "shadcnui", color: "000000", label: "shadcn/ui" },
  // TypeScript & tools
  typescript: { slug: "typescript", color: "3178C6", label: "TypeScript" },
  "@biomejs/biome": { slug: "biome", color: "60A5FA", label: "Biome" },
  eslint: { slug: "eslint", color: "4B32C3", label: "ESLint" },
  prettier: { slug: "prettier", color: "F7B93E", label: "Prettier" },
  // Build tools
  vite: { slug: "vite", color: "646CFF", label: "Vite" },
  webpack: { slug: "webpack", color: "8DD6F9", label: "Webpack" },
  rollup: { slug: "rollupdotjs", color: "EC4A3F", label: "Rollup" },
  esbuild: { slug: "esbuild", color: "FFCF00", label: "esbuild" },
  turbo: { slug: "turborepo", color: "EF4444", label: "Turborepo" },
  nx: { slug: "nx", color: "143055", label: "Nx" },
  "@changesets/cli": { slug: "changesets", color: "5846F5", label: "Changesets" },
  // Testing
  vitest: { slug: "vitest", color: "6E9F18", label: "Vitest" },
  playwright: { slug: "playwright", color: "2EAD33", label: "Playwright" },
  "@playwright/test": { slug: "playwright", color: "2EAD33", label: "Playwright" },
  jest: { slug: "jest", color: "C21325", label: "Jest" },
  cypress: { slug: "cypress", color: "69D3A7", label: "Cypress" },
  // Databases & ORMs
  prisma: { slug: "prisma", color: "2D3748", label: "Prisma" },
  "drizzle-orm": { slug: "drizzle", color: "C5F74F", label: "Drizzle" },
  "drizzle-kit": { slug: "drizzle", color: "C5F74F", label: "Drizzle" },
  kysely: { slug: "kysely", color: "1E88E5", label: "Kysely" },
  typeorm: { slug: "typeorm", color: "FE0902", label: "TypeORM" },
  mongoose: { slug: "mongodb", color: "47A248", label: "Mongoose" },
  postgres: { slug: "postgresql", color: "4169E1", label: "PostgreSQL" },
  pg: { slug: "postgresql", color: "4169E1", label: "PostgreSQL" },
  mongodb: { slug: "mongodb", color: "47A248", label: "MongoDB" },
  mysql2: { slug: "mysql", color: "4479A1", label: "MySQL" },
  redis: { slug: "redis", color: "FF4438", label: "Redis" },
  ioredis: { slug: "redis", color: "FF4438", label: "Redis" },
  // Validation
  zod: { slug: "zod", color: "3E67B1", label: "Zod" },
  valibot: { slug: "valibot", color: "0284C7", label: "Valibot" },
  // API / RPC
  "@trpc/server": { slug: "trpc", color: "398CCB", label: "tRPC" },
  "@trpc/client": { slug: "trpc", color: "398CCB", label: "tRPC" },
  graphql: { slug: "graphql", color: "E10098", label: "GraphQL" },
  // State / data
  "@tanstack/react-query": { slug: "reactquery", color: "FF4154", label: "TanStack Query" },
  "@tanstack/query-core": { slug: "reactquery", color: "FF4154", label: "TanStack Query" },
  zustand: { slug: "zustand", color: "FFB800", label: "Zustand" },
  jotai: { slug: "jotai", color: "000000", label: "Jotai" },
  // Realtime
  "socket.io": { slug: "socketdotio", color: "010101", label: "Socket.IO" },
  "socket.io-client": { slug: "socketdotio", color: "010101", label: "Socket.IO" },
  // Backend infra
  supabase: { slug: "supabase", color: "3FCF8E", label: "Supabase" },
  "@supabase/supabase-js": { slug: "supabase", color: "3FCF8E", label: "Supabase" },
  firebase: { slug: "firebase", color: "DD2C00", label: "Firebase" },
  "@firebase/app": { slug: "firebase", color: "DD2C00", label: "Firebase" },
  convex: { slug: "convex", color: "EE342F", label: "Convex" },
  // Payment
  stripe: { slug: "stripe", color: "635BFF", label: "Stripe" },
  "@stripe/stripe-js": { slug: "stripe", color: "635BFF", label: "Stripe" },
  // AI
  openai: { slug: "openai", color: "412991", label: "OpenAI" },
  "@anthropic-ai/sdk": { slug: "anthropic", color: "D97757", label: "Anthropic" },
  langchain: { slug: "langchain", color: "1C3C3C", label: "LangChain" },
  "@langchain/core": { slug: "langchain", color: "1C3C3C", label: "LangChain" },
  ai: { slug: "vercel", color: "000000", label: "AI SDK" },
  // Hosting runtime libs
  "@cloudflare/workers-types": { slug: "cloudflare", color: "F38020", label: "Cloudflare Workers" },
  wrangler: { slug: "cloudflare", color: "F38020", label: "Cloudflare Workers" },
  // Docs / content
  "@docusaurus/core": { slug: "docusaurus", color: "3ECC5F", label: "Docusaurus" },
  vitepress: { slug: "vitepress", color: "5E72E4", label: "VitePress" },
  storybook: { slug: "storybook", color: "FF4785", label: "Storybook" },
  // Pre-commit / quality
  husky: { slug: "husky", color: "3B82F6", label: "Husky" },
  "lint-staged": { slug: "git", color: "F05032", label: "lint-staged" },
  // Misc
  "@octokit/rest": { slug: "github", color: "181717", label: "Octokit" },
  "@linear/sdk": { slug: "linear", color: "5E6AD2", label: "Linear" }
};
function matchBrand(pkg) {
  if (BRANDS[pkg]) return BRANDS[pkg];
  if (pkg.startsWith("@ai-sdk/")) return BRANDS["@ai-sdk/openai"] ?? BRANDS.ai;
  if (pkg.startsWith("@supabase/")) return BRANDS["@supabase/supabase-js"];
  if (pkg.startsWith("@firebase/")) return BRANDS["@firebase/app"];
  if (pkg.startsWith("@radix-ui/")) return BRANDS["@radix-ui/react"];
  if (pkg.startsWith("@trpc/")) return BRANDS["@trpc/server"];
  if (pkg.startsWith("@langchain/")) return BRANDS["@langchain/core"];
  if (pkg.startsWith("@tanstack/")) return BRANDS["@tanstack/react-query"];
  return void 0;
}

// src/constants.ts
var SHIELDCN_BASE = "https://www.shieldcn.dev";
var RAW_GH = "https://raw.githubusercontent.com";
var NPM_REGISTRY = "https://registry.npmjs.org";
var INJECT_START = "<!-- shieldcn-start -->";
var INJECT_END = "<!-- shieldcn-end -->";
var VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "branded"
];
var SIZES = ["xs", "sm", "default", "lg"];
var THEMES = [
  "zinc",
  "slate",
  "stone",
  "neutral",
  "gray",
  "blue",
  "green",
  "rose",
  "orange",
  "amber",
  "violet",
  "purple",
  "red",
  "cyan",
  "emerald"
];

// src/url.ts
var ENCODE_MAP = [
  [/_/g, "__"],
  [/-/g, "--"]
];
function encodeStaticSegment(raw) {
  let s = raw;
  for (const [re, rep] of ENCODE_MAP) s = s.replace(re, rep);
  return s.replace(/ /g, "_");
}
function staticBadgePath(label, message, color) {
  const enc = (s) => encodeURIComponent(encodeStaticSegment(s));
  return `/badge/${enc(label)}-${enc(message)}-${color.replace(/^#/, "")}.svg`;
}
function mergeQuery(badge, global) {
  const merged = { ...badge.query };
  if (global.variant && global.variant !== "default" && !merged.variant) merged.variant = global.variant;
  if (global.size && global.size !== "sm" && global.size !== "default" && !merged.size) merged.size = global.size;
  if (global.mode && global.mode !== "dark" && !merged.mode) merged.mode = global.mode;
  if (global.theme && !merged.theme) merged.theme = global.theme;
  return merged;
}
function badgeUrl(badge, global) {
  const qs = new URLSearchParams(mergeQuery(badge, global)).toString();
  return `${SHIELDCN_BASE}${badge.path}${qs ? `?${qs}` : ""}`;
}
function badgeMarkdown(badge, global) {
  const url = badgeUrl(badge, global);
  const alt = badge.label.replace(/[\[\]]/g, "");
  const img = `![${alt}](${url})`;
  return badge.linkUrl ? `[${img}](${badge.linkUrl})` : img;
}
function badgeHtml(badge, global) {
  const url = badgeUrl(badge, global);
  const alt = badge.label.replace(/"/g, "&quot;");
  const img = `<img src="${url}" alt="${alt}" />`;
  return badge.linkUrl ? `<a href="${badge.linkUrl}">${img}</a>` : img;
}

// src/detect.ts
var BRAND_CAP = 9;
async function fetchText(url, signal) {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
async function fetchJson(url, signal) {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
async function headExists(url, signal) {
  try {
    const res = await fetch(url, { method: "HEAD", signal });
    return res.ok;
  } catch {
    return false;
  }
}
function rawUrl(owner, repo, path) {
  return `${RAW_GH}/${owner}/${repo}/HEAD/${path}`;
}
function parseGithubUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return { error: "URL is required" };
  const ownerRepoOnly = /^([\w.-]+)\/([\w.-]+)$/;
  const m1 = trimmed.match(ownerRepoOnly);
  if (m1) {
    const owner = m1[1];
    const repo = m1[2].replace(/\.git$/, "");
    return { owner, repo, url: `https://github.com/${owner}/${repo}` };
  }
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!/^github\.com$/i.test(u.hostname)) {
      return { error: "URL must be a github.com repository" };
    }
    const parts = u.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (parts.length < 2) return { error: "Could not parse owner/repo from URL" };
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    return { owner, repo, url: `https://github.com/${owner}/${repo}` };
  } catch {
    return { error: "Invalid URL" };
  }
}
var PROBE_FILES = [
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".nvmrc",
  "tsconfig.json",
  "biome.json",
  ".prettierrc",
  ".prettierrc.json",
  "prettier.config.js",
  ".eslintrc.json",
  ".eslintrc.js",
  ".eslintrc.cjs",
  "eslint.config.js",
  "eslint.config.mjs",
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
  "nuxt.config.ts",
  "nuxt.config.js",
  "astro.config.mjs",
  "astro.config.ts",
  "svelte.config.js",
  "svelte.config.ts",
  "tailwind.config.ts",
  "tailwind.config.js",
  "unocss.config.ts",
  "unocss.config.js",
  "turbo.json",
  "nx.json",
  ".changeset/README.md",
  ".storybook/main.ts",
  ".storybook/main.js",
  "vitest.config.ts",
  "vitest.config.js",
  "playwright.config.ts",
  "playwright.config.js",
  "jest.config.js",
  "jest.config.ts",
  "cypress.config.ts",
  "cypress.config.js",
  "wrangler.toml",
  "wrangler.jsonc",
  "vercel.json",
  "netlify.toml",
  "fly.toml",
  "AGENTS.md",
  "llms.txt",
  ".claude/CLAUDE.md",
  ".cursor/rules",
  "mcp.json",
  "mcp-server.json"
];
function getGitRemote(dir) {
  try {
    const configPath = join(dir, ".git", "config");
    if (!existsSync(configPath)) return null;
    const content = readFileSync(configPath, "utf-8");
    const match = content.match(
      /url\s*=\s*(?:git@github\.com:|https:\/\/github\.com\/)([\w.-]+)\/([\w.-]+?)(?:\.git)?\s*$/m
    );
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}
function localProbe(dir) {
  const result = {};
  for (const file of PROBE_FILES) {
    result[file] = existsSync(join(dir, file));
  }
  return result;
}
function localPackageJson(dir) {
  const path = join(dir, "package.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}
function localReadme(dir) {
  const candidates = ["README.md", "readme.md", "Readme.md", "README.MD"];
  for (const name of candidates) {
    const path = join(dir, name);
    if (existsSync(path)) {
      try {
        return readFileSync(path, "utf-8");
      } catch {
        continue;
      }
    }
  }
  return null;
}
function githubMetricBadges(owner, repo) {
  const mk = (id, label, path, query = {}) => ({
    id,
    group: "github",
    label,
    path,
    query,
    enabled: true
  });
  const p = (m) => `/github/${m}/${owner}/${repo}.svg`;
  return [
    mk("github.stars", "GitHub Stars", p("stars"), { variant: "secondary" }),
    mk("github.forks", "GitHub Forks", p("forks"), { variant: "secondary" }),
    mk("github.watchers", "Watchers", p("watchers"), { variant: "secondary" }),
    mk("github.contributors", "Contributors", p("contributors"), { theme: "emerald" }),
    mk("github.last-commit", "Last commit", p("last-commit"), { variant: "secondary" }),
    mk("github.open-issues", "Open issues", p("open-issues"), { variant: "secondary" }),
    mk("github.open-prs", "Open PRs", p("open-prs"), { variant: "secondary" }),
    mk("github.release", "Release", p("release")),
    mk("github.ci", "CI", p("ci"), { variant: "secondary" }),
    mk("github.license", "License", p("license"), { variant: "ghost" })
  ];
}
function npmBadges(pkg) {
  const mk = (id, label, path, query = {}) => ({
    id,
    group: "package",
    label,
    path,
    query,
    enabled: true
  });
  return [
    mk("npm.version", "npm Version", `/npm/${pkg}.svg`, { variant: "secondary" }),
    mk("npm.dw", "npm Weekly Downloads", `/npm/dw/${pkg}.svg`),
    mk("npm.dm", "npm Monthly Downloads", `/npm/dm/${pkg}.svg`, { variant: "ghost" }),
    mk("npm.dt", "npm Total Downloads", `/npm/dt/${pkg}.svg`, { variant: "secondary" }),
    mk("npm.types", "npm Types", `/npm/types/${pkg}.svg`, { theme: "blue" }),
    mk("npm.license", "npm License", `/npm/license/${pkg}.svg`, { variant: "ghost" })
  ];
}
function privatePackageBadge() {
  return {
    id: "package.private",
    group: "package",
    label: "Private package",
    path: staticBadgePath("Private", "package", "red"),
    query: { variant: "secondary" },
    enabled: true
  };
}
var TOOLING_RULES = [
  { id: "tooling.pnpm", category: "Package mgr", name: "pnpm", slug: "pnpm", color: "F69220", requires: ["pnpm-lock.yaml"] },
  { id: "tooling.bun", category: "Package mgr", name: "Bun", slug: "bun", color: "000000", requires: ["bun.lock", "bun.lockb"] },
  { id: "tooling.yarn", category: "Package mgr", name: "Yarn", slug: "yarn", color: "2C8EBB", requires: ["yarn.lock"] },
  { id: "tooling.npm", category: "Package mgr", name: "npm", slug: "npm", color: "CB3837", requires: ["package-lock.json"] },
  { id: "tooling.docker", category: "Container", name: "Docker", slug: "docker", color: "2496ED", requires: ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"] },
  { id: "tooling.typescript", category: "Language", name: "TypeScript", slug: "typescript", color: "3178C6", requires: ["tsconfig.json"] },
  { id: "tooling.biome", category: "Lint", name: "Biome", slug: "biome", color: "60A5FA", requires: ["biome.json"] },
  { id: "tooling.eslint", category: "Lint", name: "ESLint", slug: "eslint", color: "4B32C3", requires: [".eslintrc.json", ".eslintrc.js", ".eslintrc.cjs", "eslint.config.js", "eslint.config.mjs"] },
  { id: "tooling.prettier", category: "Format", name: "Prettier", slug: "prettier", color: "F7B93E", requires: [".prettierrc", ".prettierrc.json", "prettier.config.js"] },
  { id: "tooling.vite", category: "Bundler", name: "Vite", slug: "vite", color: "646CFF", requires: ["vite.config.ts", "vite.config.js", "vite.config.mjs"] },
  { id: "tooling.nextjs", category: "Framework", name: "Next.js", slug: "nextdotjs", color: "000000", requires: ["next.config.ts", "next.config.js", "next.config.mjs"] },
  { id: "tooling.nuxt", category: "Framework", name: "Nuxt", slug: "nuxt", color: "00DC82", requires: ["nuxt.config.ts", "nuxt.config.js"] },
  { id: "tooling.astro", category: "Framework", name: "Astro", slug: "astro", color: "BC52EE", requires: ["astro.config.mjs", "astro.config.ts"] },
  { id: "tooling.svelte", category: "Framework", name: "Svelte", slug: "svelte", color: "FF3E00", requires: ["svelte.config.js", "svelte.config.ts"] },
  { id: "tooling.tailwind", category: "CSS", name: "Tailwind", slug: "tailwindcss", color: "06B6D4", requires: ["tailwind.config.ts", "tailwind.config.js"] },
  { id: "tooling.unocss", category: "CSS", name: "UnoCSS", slug: "unocss", color: "333333", requires: ["unocss.config.ts", "unocss.config.js"] },
  { id: "tooling.turbo", category: "Monorepo", name: "Turborepo", slug: "turborepo", color: "EF4444", requires: ["turbo.json"] },
  { id: "tooling.nx", category: "Monorepo", name: "Nx", slug: "nx", color: "143055", requires: ["nx.json"] },
  { id: "tooling.changesets", category: "Releases", name: "Changesets", slug: "changesets", color: "5846F5", requires: [".changeset/README.md"] },
  { id: "tooling.storybook", category: "Docs", name: "Storybook", slug: "storybook", color: "FF4785", requires: [".storybook/main.ts", ".storybook/main.js"] },
  { id: "tooling.vitest", category: "Tests", name: "Vitest", slug: "vitest", color: "6E9F18", requires: ["vitest.config.ts", "vitest.config.js"] },
  { id: "tooling.playwright", category: "Tests", name: "Playwright", slug: "playwright", color: "2EAD33", requires: ["playwright.config.ts", "playwright.config.js"] },
  { id: "tooling.jest", category: "Tests", name: "Jest", slug: "jest", color: "C21325", requires: ["jest.config.js", "jest.config.ts"] },
  { id: "tooling.cypress", category: "Tests", name: "Cypress", slug: "cypress", color: "69D3A7", requires: ["cypress.config.ts", "cypress.config.js"] },
  { id: "tooling.cloudflare", category: "Hosting", name: "Cloudflare Workers", slug: "cloudflare", color: "F38020", requires: ["wrangler.toml", "wrangler.jsonc"] },
  { id: "tooling.vercel", category: "Hosting", name: "Vercel", slug: "vercel", color: "000000", requires: ["vercel.json"] },
  { id: "tooling.netlify", category: "Hosting", name: "Netlify", slug: "netlify", color: "00AD9F", requires: ["netlify.toml"] },
  { id: "tooling.fly", category: "Hosting", name: "Fly.io", slug: "flydotio", color: "24175B", requires: ["fly.toml"] }
];
function toolingBadges(probes) {
  const found = [];
  const seenSlugs = /* @__PURE__ */ new Set();
  for (const rule of TOOLING_RULES) {
    if (!rule.requires.some((f) => probes[f])) continue;
    if (seenSlugs.has(rule.slug)) continue;
    seenSlugs.add(rule.slug);
    found.push({
      id: rule.id,
      group: "tooling",
      label: `${rule.category} \xB7 ${rule.name}`,
      path: staticBadgePath(rule.category, rule.name, rule.color),
      query: { logo: rule.slug, variant: "branded" },
      enabled: true
    });
  }
  return found;
}
function stackBadges(pkg, toolingSlugs) {
  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies
  };
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const name of Object.keys(deps)) {
    const brand = matchBrand(name);
    if (!brand) continue;
    if (toolingSlugs.has(brand.slug)) continue;
    if (seen.has(brand.slug)) continue;
    seen.add(brand.slug);
    out.push({
      id: `stack.${brand.slug}`,
      group: "stack",
      label: brand.label,
      path: staticBadgePath("Stack", brand.label, brand.color),
      query: { logo: brand.slug, variant: "branded" },
      enabled: true
    });
    if (out.length >= BRAND_CAP) break;
  }
  return out;
}
function modernBadges(pkg, probes) {
  const out = [];
  const add = (id, label, message, color, variant = "secondary") => out.push({
    id,
    group: "modern",
    label: `${label} ${message}`.trim(),
    path: staticBadgePath(label, message, color),
    query: { variant },
    enabled: true
  });
  if (pkg.type === "module") add("modern.esm", "ESM", "only", "16a34a");
  if (pkg.sideEffects === false) add("modern.tree-shakeable", "Tree-shakeable", "yes", "16a34a");
  if (pkg.bin) add("modern.cli", "CLI", "tool", "7c3aed");
  if (pkg.workspaces) add("modern.monorepo", "Monorepo", "yes", "2563eb");
  if (pkg.exports && typeof pkg.exports === "object") {
    const serialized = JSON.stringify(pkg.exports);
    if (serialized.includes("import") && serialized.includes("require")) {
      add("modern.dual-package", "Dual package", "ESM+CJS", "2563eb");
    }
  }
  if (probes["AGENTS.md"]) add("modern.agents-md", "Agent-friendly", "AGENTS.md", "D97757");
  if (probes["llms.txt"]) add("modern.llms-txt", "LLM-indexed", "llms.txt", "7C3AED");
  if (probes[".claude/CLAUDE.md"]) add("modern.claude", "Claude Code", "ready", "D97757");
  if (probes[".cursor/rules"]) add("modern.cursor", "Cursor", "ready", "000000");
  if (probes["mcp.json"]) add("modern.mcp", "MCP", "server", "111827");
  return out;
}
function extractDiscordInvite(readme) {
  const re = /discord\.(?:gg|com\/invite)\/([a-zA-Z0-9-]+)/i;
  const m = readme.match(re);
  return m ? m[1] : null;
}
function extractShieldsIoUrls(readme) {
  const re = /https?:\/\/img\.shields\.io\/[^\s)"'>]+/g;
  return Array.from(new Set(readme.match(re) ?? []));
}
async function communityBadges(owner, repo, pkg, readme, signal) {
  const out = [];
  if (readme) {
    const code = extractDiscordInvite(readme);
    if (code) {
      out.push({
        id: "community.discord-members",
        group: "community",
        label: "Discord Members",
        path: `/discord/members/${code}.svg`,
        query: { variant: "secondary" },
        enabled: true
      });
      out.push({
        id: "community.discord-online",
        group: "community",
        label: "Discord Online",
        path: `/discord/online-members/${code}.svg`,
        query: { variant: "branded" },
        enabled: true
      });
    }
  }
  const fundingText = await fetchText(rawUrl(owner, repo, ".github/FUNDING.yml"), signal);
  if (fundingText) {
    let data = null;
    try {
      const { parse: parseYaml } = await import("yaml");
      data = parseYaml(fundingText);
    } catch {
      data = null;
    }
    if (data) {
      if (data.github) {
        out.push({
          id: "community.sponsor-github",
          group: "community",
          label: "GitHub Sponsors",
          path: staticBadgePath("Sponsor", "GitHub", "ea4aaa"),
          query: { logo: "githubsponsors", variant: "secondary" },
          enabled: true
        });
      }
      if (data.open_collective) {
        out.push({
          id: "community.sponsor-opencollective",
          group: "community",
          label: "Open Collective",
          path: staticBadgePath("Open Collective", "sponsor", "7FADF2"),
          query: { logo: "opencollective", variant: "secondary" },
          enabled: true
        });
      }
    }
  }
  if (pkg?.homepage && /^https?:\/\//.test(pkg.homepage)) {
    out.push({
      id: "community.homepage",
      group: "community",
      label: "Homepage",
      path: staticBadgePath("Homepage", "link", "2563eb"),
      query: { variant: "ghost" },
      enabled: true,
      linkUrl: pkg.homepage
    });
  }
  return out;
}
async function inspectLocal(dir) {
  const resolvedDir = resolve(dir);
  const remote = getGitRemote(resolvedDir);
  if (!remote) {
    return { error: "No GitHub remote found in .git/config. Use a GitHub URL instead, or run from inside a git repo." };
  }
  const { owner, repo } = remote;
  const pkg = localPackageJson(resolvedDir);
  const readme = localReadme(resolvedDir);
  const probes = localProbe(resolvedDir);
  const notes = [];
  const badges = [];
  badges.push(...githubMetricBadges(owner, repo));
  if (pkg) {
    if (pkg.private === true) {
      badges.push(privatePackageBadge());
      notes.push("package.json is private \u2014 npm badges suppressed.");
    } else if (pkg.name) {
      const npmInfo = await fetchJson(`${NPM_REGISTRY}/${pkg.name}`);
      if (npmInfo && npmInfo.name) {
        badges.push(...npmBadges(pkg.name));
      } else {
        notes.push(`Package "${pkg.name}" not found on npm \u2014 npm badges skipped.`);
      }
    }
  } else {
    notes.push("No package.json detected \u2014 npm badges skipped.");
  }
  const toolBadges = toolingBadges(probes);
  const toolingSlugs = new Set(toolBadges.map((b) => b.query.logo).filter((v) => !!v));
  badges.push(...toolBadges);
  if (pkg) {
    badges.push(...stackBadges(pkg, toolingSlugs));
    badges.push(...modernBadges(pkg, probes));
  } else {
    badges.push(...modernBadges({}, probes));
  }
  badges.push(...await communityBadges(owner, repo, pkg, readme));
  const existingShieldsIoUrls = readme ? extractShieldsIoUrls(readme) : [];
  return {
    source: { owner, repo, url: `https://github.com/${owner}/${repo}` },
    badges,
    notes,
    existingShieldsIoUrls
  };
}
async function inspectRemote(urlOrSlug) {
  const parsed = parseGithubUrl(urlOrSlug);
  if ("error" in parsed) return { error: parsed.error };
  const { owner, repo, url } = parsed;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15e3);
  const signal = controller.signal;
  try {
    const [pkgText, readme] = await Promise.all([
      fetchText(rawUrl(owner, repo, "package.json"), signal),
      (async () => {
        const candidates = ["README.md", "readme.md", "Readme.md"];
        for (const path of candidates) {
          const text = await fetchText(rawUrl(owner, repo, path), signal);
          if (text) return text;
        }
        return null;
      })()
    ]);
    const pkg = pkgText ? (() => {
      try {
        return JSON.parse(pkgText);
      } catch {
        return null;
      }
    })() : null;
    const probeEntries = await Promise.all(
      PROBE_FILES.map(async (path) => {
        const exists = await headExists(rawUrl(owner, repo, path), signal);
        return [path, exists];
      })
    );
    const probes = Object.fromEntries(probeEntries);
    const notes = [];
    const badges = [];
    badges.push(...githubMetricBadges(owner, repo));
    if (pkg) {
      if (pkg.private === true) {
        badges.push(privatePackageBadge());
        notes.push("package.json is private \u2014 npm badges suppressed.");
      } else if (pkg.name) {
        const npmInfo = await fetchJson(`${NPM_REGISTRY}/${pkg.name}`, signal);
        if (npmInfo && npmInfo.name) {
          badges.push(...npmBadges(pkg.name));
        } else {
          notes.push(`Package "${pkg.name}" not found on npm \u2014 npm badges skipped.`);
        }
      }
    } else {
      notes.push("No package.json detected \u2014 npm badges skipped.");
    }
    const toolBadges = toolingBadges(probes);
    const toolingSlugs = new Set(toolBadges.map((b) => b.query.logo).filter((v) => !!v));
    badges.push(...toolBadges);
    if (pkg) {
      badges.push(...stackBadges(pkg, toolingSlugs));
      badges.push(...modernBadges(pkg, probes));
    } else {
      badges.push(...modernBadges({}, probes));
    }
    badges.push(...await communityBadges(owner, repo, pkg, readme, signal));
    const existingShieldsIoUrls = readme ? extractShieldsIoUrls(readme) : [];
    return { source: { owner, repo, url }, badges, notes, existingShieldsIoUrls };
  } finally {
    clearTimeout(timer);
  }
}

// src/output.ts
var GROUP_TITLES = {
  github: "GitHub",
  package: "Package",
  tooling: "Tooling",
  stack: "Stack",
  modern: "Modern",
  community: "Community"
};
var GROUP_ORDER = [
  "github",
  "package",
  "tooling",
  "stack",
  "modern",
  "community"
];
function groupBadges(badges) {
  const groups = /* @__PURE__ */ new Map();
  for (const badge of badges) {
    if (!badge.enabled) continue;
    const list = groups.get(badge.group) ?? [];
    list.push(badge);
    groups.set(badge.group, list);
  }
  return groups;
}
function formatMarkdown(result, global, options = {}) {
  const { grouped = true, compact = false } = options;
  const enabled = result.badges.filter((b) => b.enabled);
  if (!grouped || compact) {
    return enabled.map((b) => badgeMarkdown(b, global)).join("\n");
  }
  const groups = groupBadges(enabled);
  const sections = [];
  for (const group of GROUP_ORDER) {
    const badges = groups.get(group);
    if (!badges || badges.length === 0) continue;
    const title = GROUP_TITLES[group];
    const lines = badges.map((b) => badgeMarkdown(b, global));
    sections.push(`### ${title}

${lines.join("\n")}`);
  }
  return sections.join("\n\n");
}
function formatFlatMarkdown(result, global) {
  return result.badges.filter((b) => b.enabled).map((b) => badgeMarkdown(b, global)).join(" ");
}
function formatHtml(result, global) {
  const enabled = result.badges.filter((b) => b.enabled);
  const groups = groupBadges(enabled);
  const sections = [];
  sections.push('<p align="center">');
  for (const group of GROUP_ORDER) {
    const badges = groups.get(group);
    if (!badges || badges.length === 0) continue;
    for (const b of badges) {
      sections.push(`  ${badgeHtml(b, global)}`);
    }
  }
  sections.push("</p>");
  return sections.join("\n");
}
function formatJson(result, global) {
  return JSON.stringify(
    {
      version: 1,
      source: result.source,
      global,
      badges: result.badges.map((b) => ({
        ...b,
        url: badgeUrl(b, global)
      })),
      notes: result.notes
    },
    null,
    2
  );
}

// src/migrate.ts
function convertShieldsUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "img.shields.io") return null;
    const path = parsed.pathname.replace(/^\/+/, "");
    const params = parsed.searchParams;
    const query = new URLSearchParams();
    const style = params.get("style");
    if (style === "flat-square" || style === "flat") query.set("variant", "secondary");
    else if (style === "for-the-badge") query.set("variant", "default");
    else if (style === "social") query.set("variant", "ghost");
    else if (style === "plastic") query.set("variant", "outline");
    const logo = params.get("logo");
    if (logo) query.set("logo", logo);
    const logoColor = params.get("logoColor");
    if (logoColor) query.set("logoColor", logoColor.replace(/^#/, ""));
    const color = params.get("color");
    if (color) query.set("color", color.replace(/^#/, ""));
    const labelColor = params.get("labelColor");
    if (labelColor) query.set("labelColor", labelColor.replace(/^#/, ""));
    const label = params.get("label");
    if (label) query.set("label", label);
    let shieldcnPath;
    let provider;
    if (path.startsWith("badge/")) {
      shieldcnPath = path;
      provider = "badge";
      if (!shieldcnPath.endsWith(".svg") && !shieldcnPath.endsWith(".png")) {
        shieldcnPath += ".svg";
      }
    } else if (path.startsWith("npm/")) {
      shieldcnPath = path.replace(/^npm\/l\//, "npm/license/").replace(/^npm\/v\//, "npm/");
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg";
      provider = "npm";
    } else if (path.startsWith("github/")) {
      shieldcnPath = path;
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg";
      provider = "github";
    } else if (path.startsWith("discord/")) {
      shieldcnPath = path;
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg";
      provider = "discord";
    } else if (path.startsWith("pypi/")) {
      shieldcnPath = path.replace(/^pypi\/v\//, "pypi/");
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg";
      provider = "pypi";
    } else if (path.startsWith("crates/")) {
      shieldcnPath = path.replace(/^crates\/v\//, "crates/");
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg";
      provider = "crates";
    } else if (path.startsWith("docker/")) {
      shieldcnPath = path;
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg";
      provider = "docker";
    } else {
      shieldcnPath = path;
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg";
      provider = path.split("/")[0] || "unknown";
    }
    const qs = query.toString();
    const converted = `${SHIELDCN_BASE}/${shieldcnPath}${qs ? `?${qs}` : ""}`;
    return { original: url, converted, provider };
  } catch {
    return null;
  }
}
function migrateAll(content) {
  const re = /https?:\/\/img\.shields\.io\/[^\s)"'>]+/g;
  const urls = Array.from(new Set(content.match(re) ?? []));
  return urls.map(convertShieldsUrl).filter((m) => m !== null);
}
function replaceShieldsUrls(content, migrations) {
  let result = content;
  for (const m of migrations) {
    result = result.replaceAll(m.original, m.converted);
  }
  return result;
}

// src/inject.ts
import { readFileSync as readFileSync2, writeFileSync, existsSync as existsSync2 } from "fs";
import { join as join2 } from "path";
var README_NAMES = ["README.md", "readme.md", "Readme.md", "README.MD"];
function findReadme(dir) {
  for (const name of README_NAMES) {
    const path = join2(dir, name);
    if (existsSync2(path)) return path;
  }
  return null;
}
function hasMarkers(content) {
  return content.includes(INJECT_START) && content.includes(INJECT_END);
}
function injectBadges(content, badgeMarkdown2) {
  const block = `${INJECT_START}
${badgeMarkdown2}
${INJECT_END}`;
  if (hasMarkers(content)) {
    const startIdx = content.indexOf(INJECT_START);
    const endIdx = content.indexOf(INJECT_END) + INJECT_END.length;
    return content.slice(0, startIdx) + block + content.slice(endIdx);
  }
  const headingMatch = content.match(/^#\s+.+$/m);
  if (headingMatch && headingMatch.index !== void 0) {
    const insertAt = headingMatch.index + headingMatch[0].length;
    return content.slice(0, insertAt) + "\n\n" + block + "\n" + content.slice(insertAt);
  }
  return block + "\n\n" + content;
}

// src/bin.ts
var version = "1.0.0";
function copyToClipboard(text) {
  try {
    const platform = process.platform;
    if (platform === "darwin") {
      execSync("pbcopy", { input: text });
      return true;
    } else if (platform === "linux") {
      try {
        execSync("xclip -selection clipboard", { input: text });
        return true;
      } catch {
        try {
          execSync("xsel --clipboard --input", { input: text });
          return true;
        } catch {
          return false;
        }
      }
    } else if (platform === "win32") {
      execSync("clip", { input: text });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
function printHeader() {
  console.log();
  console.log(pc.bold("  shieldcn") + pc.dim(" \u2014 beautiful README badges"));
  console.log(pc.dim(`  ${SHIELDCN_BASE}`));
  console.log();
}
function printBadgeSummary(badges) {
  const enabled = badges.filter((b) => b.enabled);
  const groups = /* @__PURE__ */ new Map();
  for (const b of enabled) {
    const list = groups.get(b.group) ?? [];
    list.push(b);
    groups.set(b.group, list);
  }
  const groupNames = {
    github: "GitHub",
    package: "Package",
    tooling: "Tooling",
    stack: "Stack",
    modern: "Modern",
    community: "Community"
  };
  for (const [group, list] of groups) {
    const name = groupNames[group] ?? group;
    const labels = list.map((b) => b.label).join(", ");
    console.log(`  ${pc.green("\u2713")} ${pc.bold(name)} ${pc.dim(`(${list.length})`)} ${pc.dim(labels)}`);
  }
  console.log();
  console.log(pc.dim(`  ${enabled.length} badges total`));
}
var generate = defineCommand({
  meta: {
    name: "shieldcn",
    version,
    description: "Generate beautiful README badges from your terminal."
  },
  args: {
    target: {
      type: "positional",
      description: "GitHub URL, owner/repo, or local path (defaults to current directory)",
      required: false
    },
    variant: {
      type: "string",
      description: `Badge variant: ${VARIANTS.join(", ")}`
    },
    size: {
      type: "string",
      description: `Badge size: ${SIZES.join(", ")}`
    },
    theme: {
      type: "string",
      description: `Color theme: ${THEMES.join(", ")}`
    },
    mode: {
      type: "string",
      description: "Color mode: dark, light"
    },
    format: {
      type: "string",
      description: "Output format: markdown (default), flat, html, json",
      default: "markdown"
    },
    inject: {
      type: "boolean",
      description: "Inject badges into README between <!-- shieldcn-start/end --> markers",
      default: false
    },
    copy: {
      type: "boolean",
      description: "Copy output to clipboard",
      default: false
    },
    json: {
      type: "boolean",
      description: "Output as JSON (shortcut for --format json)",
      default: false
    },
    compact: {
      type: "boolean",
      description: "Output badges without group headers",
      default: false
    }
  },
  run: async ({ args: args2 }) => {
    printHeader();
    const target = args2.target || ".";
    const isLocal = target === "." || target.startsWith("/") || target.startsWith("./") || target.startsWith("../");
    const global = {
      variant: args2.variant || "default",
      size: args2.size || "sm",
      mode: args2.mode || "dark",
      theme: args2.theme || ""
    };
    if (global.variant && !VARIANTS.includes(global.variant)) {
      consola.error(`Invalid variant "${global.variant}". Valid: ${VARIANTS.join(", ")}`);
      process.exit(1);
    }
    if (global.size && !SIZES.includes(global.size)) {
      consola.error(`Invalid size "${global.size}". Valid: ${SIZES.join(", ")}`);
      process.exit(1);
    }
    consola.start(
      isLocal ? `Scanning local directory ${pc.cyan(resolve2(target))}...` : `Scanning ${pc.cyan(target)}...`
    );
    const result = isLocal ? await inspectLocal(resolve2(target)) : await inspectRemote(target);
    if ("error" in result) {
      consola.error(result.error);
      process.exit(1);
    }
    if (result.notes.length > 0) {
      for (const note of result.notes) {
        consola.info(pc.dim(note));
      }
    }
    console.log();
    console.log(
      `  ${pc.bold(result.source.owner)}/${pc.bold(result.source.repo)} ${pc.dim("\u2192")} ${pc.dim(result.source.url)}`
    );
    console.log();
    printBadgeSummary(result.badges);
    if (result.existingShieldsIoUrls.length > 0) {
      console.log();
      consola.info(
        `Found ${pc.yellow(String(result.existingShieldsIoUrls.length))} shields.io URLs in README. Run ${pc.cyan("shieldcn migrate")} to convert them.`
      );
    }
    const format = args2.json ? "json" : args2.format || "markdown";
    let output;
    switch (format) {
      case "json":
        output = formatJson(result, global);
        break;
      case "html":
        output = formatHtml(result, global);
        break;
      case "flat":
        output = formatFlatMarkdown(result, global);
        break;
      case "markdown":
      default:
        output = formatMarkdown(result, global, { compact: args2.compact });
        break;
    }
    if (args2.inject) {
      const readmePath = findReadme(isLocal ? resolve2(target) : ".");
      if (!readmePath) {
        consola.error("No README.md found to inject into.");
        process.exit(1);
      }
      const flatOutput = formatFlatMarkdown(result, global);
      const content = readFileSync3(readmePath, "utf-8");
      const updated = injectBadges(content, flatOutput);
      writeFileSync2(readmePath, updated, "utf-8");
      const verb = hasMarkers(content) ? "Updated" : "Added";
      consola.success(`${verb} badges in ${pc.cyan(readmePath)}`);
      return;
    }
    console.log();
    console.log(pc.dim("\u2500".repeat(60)));
    console.log();
    console.log(output);
    console.log();
    console.log(pc.dim("\u2500".repeat(60)));
    if (args2.copy) {
      if (copyToClipboard(output)) {
        consola.success("Copied to clipboard");
      } else {
        consola.warn("Could not copy to clipboard");
      }
    }
  }
});
var migrate = defineCommand({
  meta: {
    name: "migrate",
    description: "Convert shields.io URLs in README to shieldcn."
  },
  args: {
    file: {
      type: "positional",
      description: "Path to README file (defaults to README.md in current directory)",
      required: false
    },
    dry: {
      type: "boolean",
      description: "Preview changes without writing",
      default: false
    },
    write: {
      type: "boolean",
      description: "Write changes to file",
      default: false
    }
  },
  run: async ({ args: args2 }) => {
    printHeader();
    const filePath = args2.file || findReadme(".") || "README.md";
    let content;
    try {
      content = readFileSync3(filePath, "utf-8");
    } catch {
      consola.error(`Could not read ${pc.cyan(filePath)}`);
      process.exit(1);
    }
    const migrations = migrateAll(content);
    if (migrations.length === 0) {
      consola.success("No shields.io URLs found. Nothing to migrate.");
      return;
    }
    console.log(`  Found ${pc.yellow(String(migrations.length))} shields.io badge(s):
`);
    for (let i = 0; i < migrations.length; i++) {
      const m = migrations[i];
      console.log(`  ${pc.dim(`${i + 1}.`)} ${pc.strikethrough(pc.red(m.original))}`);
      console.log(`     ${pc.green("\u2192")} ${pc.green(m.converted)}`);
      console.log();
    }
    if (args2.dry) {
      consola.info("Dry run \u2014 no changes written.");
      return;
    }
    if (args2.write) {
      const updated = replaceShieldsUrls(content, migrations);
      writeFileSync2(filePath, updated, "utf-8");
      consola.success(`Updated ${pc.cyan(filePath)} with ${migrations.length} replacement(s).`);
      return;
    }
    const confirmed = await consola.prompt(
      `Replace ${migrations.length} URL(s) in ${filePath}?`,
      { type: "confirm" }
    );
    if (confirmed) {
      const updated = replaceShieldsUrls(content, migrations);
      writeFileSync2(filePath, updated, "utf-8");
      consola.success(`Updated ${pc.cyan(filePath)} with ${migrations.length} replacement(s).`);
    } else {
      consola.info("No changes made.");
    }
  }
});
var init = defineCommand({
  meta: {
    name: "init",
    description: "Add shieldcn markers to your README for badge injection."
  },
  args: {
    file: {
      type: "positional",
      description: "Path to README file",
      required: false
    }
  },
  run: async ({ args: args2 }) => {
    printHeader();
    const filePath = args2.file || findReadme(".") || "README.md";
    let content;
    try {
      content = readFileSync3(filePath, "utf-8");
    } catch {
      consola.error(`Could not read ${pc.cyan(filePath)}`);
      process.exit(1);
    }
    if (hasMarkers(content)) {
      consola.info(`${pc.cyan(filePath)} already has shieldcn markers.`);
      return;
    }
    const updated = injectBadges(content, "<!-- your badges will appear here -->");
    writeFileSync2(filePath, updated, "utf-8");
    consola.success(`Added shieldcn markers to ${pc.cyan(filePath)}`);
    consola.info(`Run ${pc.cyan("shieldcn --inject")} to populate them.`);
  }
});
var args = process.argv.slice(2);
var firstArg = args[0];
if (firstArg === "migrate") {
  process.argv = [process.argv[0], process.argv[1], ...args.slice(1)];
  runMain(migrate);
} else if (firstArg === "init") {
  process.argv = [process.argv[0], process.argv[1], ...args.slice(1)];
  runMain(init);
} else if (firstArg === "--help" || firstArg === "-h") {
  runMain(generate);
} else if (firstArg === "--version" || firstArg === "-v") {
  console.log(version);
} else {
  runMain(generate);
}
