export type Brand = {
  slug: string;
  color: string;
  label: string;
};

// Map of npm package name → brand. Matches both exact names and scoped prefixes
// (see matchBrand). Colors are official brand colors, hex without '#'.
export const BRANDS: Record<string, Brand> = {
  // React ecosystem
  react: { slug: 'react', color: '61DAFB', label: 'React' },
  'react-dom': { slug: 'react', color: '61DAFB', label: 'React' },
  next: { slug: 'nextdotjs', color: '000000', label: 'Next.js' },
  '@next/env': { slug: 'nextdotjs', color: '000000', label: 'Next.js' },
  '@t3-oss/env-nextjs': { slug: 'nextdotjs', color: '000000', label: 'Next.js' },
  astro: { slug: 'astro', color: 'BC52EE', label: 'Astro' },
  '@astrojs/cloudflare': { slug: 'astro', color: 'BC52EE', label: 'Astro' },
  svelte: { slug: 'svelte', color: 'FF3E00', label: 'Svelte' },
  '@sveltejs/kit': { slug: 'svelte', color: 'FF3E00', label: 'SvelteKit' },
  vue: { slug: 'vuedotjs', color: '4FC08D', label: 'Vue' },
  nuxt: { slug: 'nuxt', color: '00DC82', label: 'Nuxt' },
  'solid-js': { slug: 'solid', color: '2C4F7C', label: 'Solid' },
  '@builder.io/qwik': { slug: 'qwik', color: '18B6F6', label: 'Qwik' },

  // CSS / UI
  tailwindcss: { slug: 'tailwindcss', color: '06B6D4', label: 'Tailwind CSS' },
  unocss: { slug: 'unocss', color: '333333', label: 'UnoCSS' },
  '@radix-ui/react': { slug: 'radixui', color: '000000', label: 'Radix UI' },
  '@shadcn/ui': { slug: 'shadcnui', color: '000000', label: 'shadcn/ui' },

  // TypeScript & tools
  typescript: { slug: 'typescript', color: '3178C6', label: 'TypeScript' },
  '@biomejs/biome': { slug: 'biome', color: '60A5FA', label: 'Biome' },
  eslint: { slug: 'eslint', color: '4B32C3', label: 'ESLint' },
  prettier: { slug: 'prettier', color: 'F7B93E', label: 'Prettier' },

  // Build tools
  vite: { slug: 'vite', color: '646CFF', label: 'Vite' },
  webpack: { slug: 'webpack', color: '8DD6F9', label: 'Webpack' },
  rollup: { slug: 'rollupdotjs', color: 'EC4A3F', label: 'Rollup' },
  esbuild: { slug: 'esbuild', color: 'FFCF00', label: 'esbuild' },
  turbo: { slug: 'turborepo', color: 'EF4444', label: 'Turborepo' },
  nx: { slug: 'nx', color: '143055', label: 'Nx' },
  '@changesets/cli': { slug: 'changesets', color: '5846F5', label: 'Changesets' },

  // Testing
  vitest: { slug: 'vitest', color: '6E9F18', label: 'Vitest' },
  playwright: { slug: 'playwright', color: '2EAD33', label: 'Playwright' },
  '@playwright/test': { slug: 'playwright', color: '2EAD33', label: 'Playwright' },
  jest: { slug: 'jest', color: 'C21325', label: 'Jest' },
  cypress: { slug: 'cypress', color: '69D3A7', label: 'Cypress' },

  // Databases & ORMs
  prisma: { slug: 'prisma', color: '2D3748', label: 'Prisma' },
  'drizzle-orm': { slug: 'drizzle', color: 'C5F74F', label: 'Drizzle' },
  'drizzle-kit': { slug: 'drizzle', color: 'C5F74F', label: 'Drizzle' },
  kysely: { slug: 'kysely', color: '1E88E5', label: 'Kysely' },
  typeorm: { slug: 'typeorm', color: 'FE0902', label: 'TypeORM' },
  mongoose: { slug: 'mongodb', color: '47A248', label: 'Mongoose' },
  postgres: { slug: 'postgresql', color: '4169E1', label: 'PostgreSQL' },
  pg: { slug: 'postgresql', color: '4169E1', label: 'PostgreSQL' },
  mongodb: { slug: 'mongodb', color: '47A248', label: 'MongoDB' },
  mysql2: { slug: 'mysql', color: '4479A1', label: 'MySQL' },
  redis: { slug: 'redis', color: 'FF4438', label: 'Redis' },
  ioredis: { slug: 'redis', color: 'FF4438', label: 'Redis' },

  // Validation
  zod: { slug: 'zod', color: '3E67B1', label: 'Zod' },
  valibot: { slug: 'valibot', color: '0284C7', label: 'Valibot' },
  arktype: { slug: 'typescript', color: '3178C6', label: 'ArkType' },

  // API / RPC
  '@trpc/server': { slug: 'trpc', color: '398CCB', label: 'tRPC' },
  '@trpc/client': { slug: 'trpc', color: '398CCB', label: 'tRPC' },
  graphql: { slug: 'graphql', color: 'E10098', label: 'GraphQL' },

  // State / data
  '@tanstack/react-query': { slug: 'reactquery', color: 'FF4154', label: 'TanStack Query' },
  '@tanstack/query-core': { slug: 'reactquery', color: 'FF4154', label: 'TanStack Query' },
  zustand: { slug: 'zustand', color: 'FFB800', label: 'Zustand' },
  jotai: { slug: 'jotai', color: '000000', label: 'Jotai' },

  // Realtime
  'socket.io': { slug: 'socketdotio', color: '010101', label: 'Socket.IO' },
  'socket.io-client': { slug: 'socketdotio', color: '010101', label: 'Socket.IO' },

  // Backend infra
  supabase: { slug: 'supabase', color: '3FCF8E', label: 'Supabase' },
  '@supabase/supabase-js': { slug: 'supabase', color: '3FCF8E', label: 'Supabase' },
  firebase: { slug: 'firebase', color: 'DD2C00', label: 'Firebase' },
  '@firebase/app': { slug: 'firebase', color: 'DD2C00', label: 'Firebase' },
  convex: { slug: 'convex', color: 'EE342F', label: 'Convex' },
  'better-auth': { slug: 'lucide:lock-keyhole', color: '000000', label: 'Better Auth' },

  // Payment
  stripe: { slug: 'stripe', color: '635BFF', label: 'Stripe' },
  '@stripe/stripe-js': { slug: 'stripe', color: '635BFF', label: 'Stripe' },

  // Comms
  twilio: { slug: 'twilio', color: 'F22F46', label: 'Twilio' },

  // AI
  openai: { slug: 'openai', color: '412991', label: 'OpenAI' },
  '@anthropic-ai/sdk': { slug: 'anthropic', color: 'D97757', label: 'Anthropic' },
  langchain: { slug: 'langchain', color: '1C3C3C', label: 'LangChain' },
  '@langchain/core': { slug: 'langchain', color: '1C3C3C', label: 'LangChain' },
  '@ai-sdk/openai': { slug: 'openai', color: '412991', label: 'AI SDK · OpenAI' },
  '@ai-sdk/anthropic': { slug: 'anthropic', color: 'D97757', label: 'AI SDK · Anthropic' },
  ai: { slug: 'vercel', color: '000000', label: 'AI SDK' },

  // Hosting runtime libs
  '@cloudflare/workers-types': { slug: 'cloudflare', color: 'F38020', label: 'Cloudflare Workers' },
  wrangler: { slug: 'cloudflare', color: 'F38020', label: 'Cloudflare Workers' },

  // Docs / content
  '@docusaurus/core': { slug: 'docusaurus', color: '3ECC5F', label: 'Docusaurus' },
  vitepress: { slug: 'vitepress', color: '5E72E4', label: 'VitePress' },
  storybook: { slug: 'storybook', color: 'FF4785', label: 'Storybook' },

  // Pre-commit / quality
  husky: { slug: 'husky', color: '3B82F6', label: 'Husky' },
  'lint-staged': { slug: 'git', color: 'F05032', label: 'lint-staged' },

  // Misc
  '@octokit/rest': { slug: 'github', color: '181717', label: 'Octokit' },
  '@linear/sdk': { slug: 'linear', color: '5E6AD2', label: 'Linear' },
};

export function matchBrand(pkg: string): Brand | undefined {
  if (BRANDS[pkg]) return BRANDS[pkg];
  // scoped prefix match: "@ai-sdk/openai" → try "@ai-sdk/openai" exact above,
  // then try other scoped-variant keys
  if (pkg.startsWith('@ai-sdk/')) {
    return BRANDS['@ai-sdk/openai'];
  }
  if (pkg.startsWith('@supabase/')) {
    return BRANDS['@supabase/supabase-js'];
  }
  if (pkg.startsWith('@firebase/')) {
    return BRANDS['@firebase/app'];
  }
  if (pkg.startsWith('@radix-ui/')) {
    return BRANDS['@radix-ui/react'];
  }
  if (pkg.startsWith('@trpc/')) {
    return BRANDS['@trpc/server'];
  }
  if (pkg.startsWith('@langchain/')) {
    return BRANDS['@langchain/core'];
  }
  if (pkg.startsWith('@tanstack/')) {
    return BRANDS['@tanstack/react-query'];
  }
  return undefined;
}
