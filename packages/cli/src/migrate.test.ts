/**
 * shieldcn CLI
 * src/migrate.test
 *
 * `convertShieldsUrl`'s regex-driven URL rewriting is the entire value
 * proposition of `shieldcn migrate` — previously zero coverage.
 */

import { describe, it, expect } from "vitest"
import { convertShieldsUrl, migrateAll, replaceShieldsUrls } from "./migrate.js"

describe("convertShieldsUrl", () => {
  it("returns null for a non-shields.io host", () => {
    expect(convertShieldsUrl("https://example.com/badge/foo-bar-green")).toBeNull()
  })

  it("returns null for a malformed URL", () => {
    expect(convertShieldsUrl("not a url")).toBeNull()
  })

  it("converts a static badge, preserving the label-message-color path", () => {
    const m = convertShieldsUrl("https://img.shields.io/badge/build-passing-green")
    expect(m).not.toBeNull()
    expect(m?.provider).toBe("badge")
    expect(m?.converted).toBe("https://www.shieldcn.dev/badge/build-passing-green.svg")
  })

  it("doesn't double-append .svg when the source already has an extension", () => {
    const m = convertShieldsUrl("https://img.shields.io/badge/build-passing-green.svg")
    expect(m?.converted).toBe("https://www.shieldcn.dev/badge/build-passing-green.svg")
  })

  it("preserves a .png extension instead of forcing .svg", () => {
    const m = convertShieldsUrl("https://img.shields.io/badge/build-passing-green.png")
    expect(m?.converted).toBe("https://www.shieldcn.dev/badge/build-passing-green.png")
  })

  it("rewrites npm/v/{pkg} to npm/{pkg} and marks it branded (npm has a brand color)", () => {
    const m = convertShieldsUrl("https://img.shields.io/npm/v/react")
    expect(m?.provider).toBe("npm")
    expect(m?.converted).toBe("https://www.shieldcn.dev/npm/react.svg?variant=branded")
  })

  it("rewrites npm/l/{pkg} (legacy license shorthand) to npm/license/{pkg}", () => {
    const m = convertShieldsUrl("https://img.shields.io/npm/l/react")
    expect(m?.converted).toBe("https://www.shieldcn.dev/npm/license/react.svg?variant=branded")
  })

  it("passes github paths straight through, appending .svg", () => {
    const m = convertShieldsUrl("https://img.shields.io/github/stars/facebook/react")
    expect(m?.provider).toBe("github")
    expect(m?.converted).toBe("https://www.shieldcn.dev/github/stars/facebook/react.svg?variant=branded")
  })

  it("rewrites twitter/follow/{user} to x/follow/{user}", () => {
    const m = convertShieldsUrl("https://img.shields.io/twitter/follow/vercel")
    expect(m?.provider).toBe("x")
    expect(m?.converted).toBe("https://www.shieldcn.dev/x/follow/vercel.svg?variant=branded")
  })

  it("returns null for a twitter/follow path with no username segment", () => {
    expect(convertShieldsUrl("https://img.shields.io/twitter/follow/")).toBeNull()
  })

  it("falls back to a best-effort pass-through for an unrecognized provider", () => {
    const m = convertShieldsUrl("https://img.shields.io/some-unknown-provider/foo")
    expect(m?.provider).toBe("some-unknown-provider")
    expect(m?.converted).toBe("https://www.shieldcn.dev/some-unknown-provider/foo.svg")
  })

  describe("query param mapping", () => {
    it("maps style=flat-square and style=flat to variant=secondary", () => {
      expect(convertShieldsUrl("https://img.shields.io/badge/a-b-green?style=flat-square")?.converted)
        .toContain("variant=secondary")
      expect(convertShieldsUrl("https://img.shields.io/badge/a-b-green?style=flat")?.converted)
        .toContain("variant=secondary")
    })

    it("maps style=for-the-badge to variant=default", () => {
      expect(convertShieldsUrl("https://img.shields.io/badge/a-b-green?style=for-the-badge")?.converted)
        .toContain("variant=default")
    })

    it("maps style=social to variant=ghost and style=plastic to variant=outline", () => {
      expect(convertShieldsUrl("https://img.shields.io/badge/a-b-green?style=social")?.converted)
        .toContain("variant=ghost")
      expect(convertShieldsUrl("https://img.shields.io/badge/a-b-green?style=plastic")?.converted)
        .toContain("variant=outline")
    })

    it("strips a leading # from color/labelColor/logoColor", () => {
      const m = convertShieldsUrl("https://img.shields.io/badge/a-b-green?color=%23ff0000&labelColor=%2300ff00")
      const params = new URL(m!.converted).searchParams
      expect(params.get("color")).toBe("ff0000")
      expect(params.get("labelColor")).toBe("00ff00")
    })

    it("passes through label and logo unchanged", () => {
      const m = convertShieldsUrl("https://img.shields.io/badge/a-b-green?label=My%20Label&logo=github")
      const params = new URL(m!.converted).searchParams
      expect(params.get("label")).toBe("My Label")
      expect(params.get("logo")).toBe("github")
    })

    it("respects an explicit style/variant instead of the auto-branded default", () => {
      // npm is a branded provider, but an explicit style should win.
      const m = convertShieldsUrl("https://img.shields.io/npm/v/react?style=flat")
      const params = new URL(m!.converted).searchParams
      expect(params.get("variant")).toBe("secondary")
    })
  })

  describe("branded-variant auto-detection", () => {
    it("marks a known-brand provider as branded and drops logoColor", () => {
      const m = convertShieldsUrl("https://img.shields.io/docker/pulls/library/nginx?logoColor=white")
      const params = new URL(m!.converted).searchParams
      expect(params.get("variant")).toBe("branded")
      expect(params.has("logoColor")).toBe(false)
    })

    it("does not mark an unrecognized provider as branded", () => {
      const m = convertShieldsUrl("https://img.shields.io/some-unknown-provider/foo")
      const params = new URL(m!.converted).searchParams
      expect(params.has("variant")).toBe(false)
    })

    it("marks a static badge as branded only when its logo matches a branded provider", () => {
      const branded = convertShieldsUrl("https://img.shields.io/badge/a-b-green?logo=npm")
      expect(new URL(branded!.converted).searchParams.get("variant")).toBe("branded")

      const notBranded = convertShieldsUrl("https://img.shields.io/badge/a-b-green?logo=not-a-brand")
      expect(new URL(notBranded!.converted).searchParams.has("variant")).toBe(false)

      const noLogo = convertShieldsUrl("https://img.shields.io/badge/a-b-green")
      expect(new URL(noLogo!.converted).searchParams.has("variant")).toBe(false)
    })
  })
})

describe("migrateAll", () => {
  it("finds and converts every shields.io URL in a blob of text, deduplicated", () => {
    const content = `
      ![npm](https://img.shields.io/npm/v/react)
      ![stars](https://img.shields.io/github/stars/facebook/react)
      ![npm again](https://img.shields.io/npm/v/react)
      [not a badge](https://example.com/foo)
    `
    const migrations = migrateAll(content)
    expect(migrations).toHaveLength(2)
    expect(migrations.map((m) => m.provider).sort()).toEqual(["github", "npm"])
  })

  it("returns an empty array when no shields.io URLs are present", () => {
    expect(migrateAll("no badges here")).toEqual([])
  })

  it("doesn't swallow a trailing markdown/HTML delimiter into the matched URL", () => {
    const content = "![badge](https://img.shields.io/npm/v/react) and <img src=\"https://img.shields.io/github/stars/facebook/react\">"
    const migrations = migrateAll(content)
    expect(migrations.map((m) => m.original)).toEqual([
      "https://img.shields.io/npm/v/react",
      "https://img.shields.io/github/stars/facebook/react",
    ])
  })
})

describe("replaceShieldsUrls", () => {
  it("replaces every occurrence of each migrated URL in the content", () => {
    const content = "a https://img.shields.io/npm/v/react b https://img.shields.io/npm/v/react c"
    const migrations = migrateAll(content)
    const result = replaceShieldsUrls(content, migrations)
    expect(result).toBe(`a ${migrations[0]!.converted} b ${migrations[0]!.converted} c`)
  })

  it("is a no-op when there are no migrations", () => {
    expect(replaceShieldsUrls("hello world", [])).toBe("hello world")
  })
})
