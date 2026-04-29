/**
 * @shieldcn/core
 * src/next-fetch.d.ts
 *
 * Extends the global RequestInit type with Next.js-specific properties.
 * This code always runs inside a Next.js app (web or engine), so
 * the `next` property on fetch options is always available at runtime.
 */

interface RequestInit {
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
}
