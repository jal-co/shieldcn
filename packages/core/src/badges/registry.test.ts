/**
 * shieldcn
 * lib/badges/registry.test
 *
 * Proves the registry is the source of truth and that validation enforces it.
 * Scoped (per rollout plan B) to npm, github, and the static badge provider.
 */

import { describe, expect, it } from "vitest"
import { ALL_VARIANTS, REGISTRY, allowedVariants, allowedVariantsForPath, resolveTopic } from "./registry"
import { resolveVariant, validateBadgeRequest } from "./validate"

describe("registry shape", () => {
  it("every topic has a non-empty example", () => {
    for (const provider of REGISTRY) {
      for (const topic of provider.topics) {
        expect(topic.example.length, `${provider.provider}/${topic.topic}`).toBeGreaterThan(0)
      }
    }
  })

  it("ALL_VARIANTS matches the documented 6 (no phantom variants)", () => {
    expect([...ALL_VARIANTS]).toEqual([
      "default",
      "secondary",
      "outline",
      "ghost",
      "destructive",
      "branded",
    ])
  })

  it("every declared variant is a real variant", () => {
    for (const provider of REGISTRY) {
      for (const topic of provider.topics) {
        for (const v of topic.variants ?? []) {
          expect(ALL_VARIANTS, `${provider.provider}/${topic.topic}`).toContain(v)
        }
      }
    }
  })

  it("topics within a provider are unique", () => {
    for (const provider of REGISTRY) {
      const keys = provider.topics.map((t) => t.topic)
      expect(new Set(keys).size, provider.provider).toBe(keys.length)
    }
  })

  it("every topic's example resolves back to that topic (no drift)", () => {
    for (const provider of REGISTRY) {
      if (provider.freeform) continue
      for (const topic of provider.topics) {
        const resolved = resolveTopic(provider.provider, topic.example)
        expect(resolved?.topic, `${provider.provider}/${topic.topic} → ${topic.example.join("/")}`).toBe(topic.topic)
      }
    }
  })
})

describe("resolveTopic", () => {
  it("resolves a known npm topic", () => {
    expect(resolveTopic("npm", ["v", "react"])?.topic).toBe("v")
  })

  it("resolves a github topic from the /{topic}/{owner}/{repo} form", () => {
    expect(resolveTopic("github", ["stars", "facebook", "react"])?.topic).toBe("stars")
  })

  it("resolves a github topic from the /{owner}/{repo}/{topic} form", () => {
    expect(resolveTopic("github", ["facebook", "react", "stars"])?.topic).toBe("stars")
  })

  it("wildcard provider matches any segments", () => {
    expect(resolveTopic("badge", ["build-passing-green"])?.topic).toBe("*")
  })

  it("returns null for an unknown topic on a provider with no default", () => {
    // reddit has no defaultTopic, so an unrecognized segment is a real error.
    expect(resolveTopic("reddit", ["bogus"])).toBeNull()
  })

  it("falls back to defaultTopic when no topic segment is present", () => {
    // npm treats a bare segment as a package name → default "v" (legacy behavior).
    expect(resolveTopic("npm", ["react"])?.topic).toBe("v")
  })

  it("returns null for an unregistered provider", () => {
    expect(resolveTopic("not-a-real-provider", ["123"])).toBeNull()
  })
})

describe("validateBadgeRequest", () => {
  it("passes a valid npm version + default variant", () => {
    expect(validateBadgeRequest("npm", ["v", "react"], undefined).ok).toBe(true)
  })

  it("passes a valid npm version + outline variant", () => {
    expect(validateBadgeRequest("npm", ["v", "react"], "outline").ok).toBe(true)
  })

  it("defers (ok) on an unknown topic — data layer handles not-found", () => {
    // Non-breaking: unknown topics are not rejected here; fetchBadgeData
    // returns a graceful "not found" badge instead.
    expect(validateBadgeRequest("reddit", ["bogus"], undefined).ok).toBe(true)
  })

  it("does not enforce variants on an unknown topic", () => {
    // Topic unknown → no variant policy → allow anything.
    expect(validateBadgeRequest("reddit", ["bogus"], "branded").ok).toBe(true)
  })

  it("rejects an unknown variant string", () => {
    const r = validateBadgeRequest("npm", ["v", "react"], "sparkly")
    expect(r.ok).toBe(false)
    expect(r.code).toBe("unsupported-variant")
  })

  it("rejects branded on a github CI status badge", () => {
    const r = validateBadgeRequest("github", ["ci", "facebook", "react"], "branded")
    expect(r.ok).toBe(false)
    expect(r.code).toBe("unsupported-variant")
    expect(r.message).toContain("github/ci")
  })

  it("allows branded on github stars", () => {
    expect(validateBadgeRequest("github", ["stars", "facebook", "react"], "branded").ok).toBe(true)
  })

  it("defers (ok) for unregistered providers — non-breaking rollout", () => {
    expect(validateBadgeRequest("not-a-real-provider", ["123"], "branded").ok).toBe(true)
  })
})

describe("allowedVariantsForPath (drives the builder dropdown)", () => {
  it("narrows branded out for a github CI path (with .svg + both orderings)", () => {
    expect(allowedVariantsForPath("/github/vercel/next.js/ci.svg")).not.toContain("branded")
    expect(allowedVariantsForPath("github/ci/vercel/next.js")).not.toContain("branded")
  })

  it("allows all variants for github stars", () => {
    expect(allowedVariantsForPath("/github/vercel/next.js/stars.svg")).toEqual(ALL_VARIANTS)
  })

  it("allows all variants for a static badge", () => {
    expect(allowedVariantsForPath("/badge/build-passing-green.svg")).toEqual(ALL_VARIANTS)
  })

  it("allows all variants for groups", () => {
    expect(allowedVariantsForPath("/group/npm/react+github/stars/vercel/next.js.svg")).toEqual(ALL_VARIANTS)
  })

  it("defers to ALL_VARIANTS for unregistered providers", () => {
    expect(allowedVariantsForPath("/not-a-real-provider/123.svg")).toEqual(ALL_VARIANTS)
  })

  it("drops branded for the flag provider (no brand identity)", () => {
    expect(allowedVariantsForPath("/flag/in.svg")).not.toContain("branded")
  })
})

describe("resolveVariant (route coercion — non-breaking)", () => {
  it("keeps a valid variant", () => {
    expect(resolveVariant("npm", ["v", "react"], "outline")).toBe("outline")
  })

  it("coerces branded on a state badge to default (not an error)", () => {
    expect(resolveVariant("github", ["ci", "facebook", "react"], "branded")).toBe("default")
  })

  it("coerces legacy/unknown variant strings to default (legacy parity)", () => {
    expect(resolveVariant("npm", ["v", "react"], "flat")).toBe("default")
    expect(resolveVariant("npm", ["v", "react"], "subtle")).toBe("default")
    expect(resolveVariant("npm", ["v", "react"], "sparkly")).toBe("default")
  })

  it("defaults when nothing requested", () => {
    expect(resolveVariant("npm", ["v", "react"], undefined)).toBe("default")
  })

  it("coerces branded on a flag badge to default", () => {
    expect(resolveVariant("flag", ["in"], "branded")).toBe("default")
  })

  it("keeps a valid variant on unregistered providers", () => {
    expect(resolveVariant("not-a-real-provider", ["x"], "branded")).toBe("branded")
  })
})

describe("allowedVariants", () => {
  it("falls back to ALL_VARIANTS when a topic doesn't narrow", () => {
    const npm = REGISTRY.find((p) => p.provider === "npm")!
    const v = npm.topics.find((t) => t.topic === "v")!
    expect(allowedVariants(v)).toEqual(ALL_VARIANTS)
  })

  it("uses the narrowed list when present", () => {
    const gh = REGISTRY.find((p) => p.provider === "github")!
    const ci = gh.topics.find((t) => t.topic === "ci")!
    expect(allowedVariants(ci)).not.toContain("branded")
  })
})
