/**
 * shieldcn
 * providers/badge.test
 *
 * `parseStaticBadgeContent` is the shields.io-compatible static badge parser
 * (`/badge/{content}.svg`) — pure, security-adjacent (it's fed directly from
 * the URL path, unsanitized), and previously had zero coverage despite the
 * escaping rules (double-dash, single/double underscore, %-encoding) being
 * exactly the kind of logic that regresses silently. `getDynamicJsonBadge`
 * is covered too, mocking the network boundary the same way safe-fetch.test.ts
 * does (DNS lookup + global fetch), since it's the one function here that
 * actually reaches out to the internet.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }))
vi.mock("node:dns/promises", () => ({ lookup: lookupMock }))

import {
  parseStaticBadgeContent,
  isKnownFlagCode,
  listFlagCodes,
  getFlagBadge,
  getDynamicJsonBadge,
} from "./badge"

describe("parseStaticBadgeContent", () => {
  it("parses label-message-color (the 3-segment case), resolving the color to hex", () => {
    expect(parseStaticBadgeContent("build-passing-brightgreen")).toEqual({
      label: "build",
      value: "passing",
      color: "44cc11",
    })
  })

  it("parses message-color when the color resolves (2-segment case)", () => {
    expect(parseStaticBadgeContent("passing-brightgreen")).toEqual({
      label: "",
      value: "passing",
      color: "44cc11",
    })
  })

  it("parses label-message when the second segment is NOT a valid color", () => {
    // "world" isn't a recognized color name, so this is label-message, no color.
    expect(parseStaticBadgeContent("hello-world")).toEqual({
      label: "hello",
      value: "world",
      color: undefined,
    })
  })

  it("treats a single segment as message-only", () => {
    expect(parseStaticBadgeContent("standalone")).toEqual({
      label: "",
      value: "standalone",
      color: undefined,
    })
  })

  it("treats the whole string as the message when it's empty", () => {
    expect(parseStaticBadgeContent("")).toEqual({
      label: "",
      value: "",
      color: undefined,
    })
  })

  it("takes the LAST segment as color and the first as label when 4+ segments and the last resolves", () => {
    // "a-b-c-brightgreen" → label "a", message "b-c", color brightgreen
    expect(parseStaticBadgeContent("a-b-c-brightgreen")).toEqual({
      label: "a",
      value: "b-c",
      color: "44cc11",
    })
  })

  it("falls back to label-message (whole tail) when 3+ segments but the last isn't a color", () => {
    expect(parseStaticBadgeContent("license-MIT-permissive")).toEqual({
      label: "license",
      value: "MIT-permissive",
      color: undefined,
    })
  })

  it("treats a double-dash as a literal dash within a segment, not a separator", () => {
    // "co--op-passing-green": segments are ["co-op", "passing", "green"]
    expect(parseStaticBadgeContent("co--op-passing-green")).toEqual({
      label: "co-op",
      value: "passing",
      color: "16a34a",
    })
  })

  it("decodes single underscores to spaces", () => {
    expect(parseStaticBadgeContent("build_status-passing-green")).toEqual({
      label: "build status",
      value: "passing",
      color: "16a34a",
    })
  })

  it("decodes double underscores to a literal underscore (not a space)", () => {
    expect(parseStaticBadgeContent("my__var-value-green")).toEqual({
      label: "my_var",
      value: "value",
      color: "16a34a",
    })
  })

  it("decodes %20 and other percent-encoding via decodeURIComponent", () => {
    expect(parseStaticBadgeContent("hello%20world-value-green")).toEqual({
      label: "hello world",
      value: "value",
      color: "16a34a",
    })
  })

  it("falls back to the raw text when percent-decoding is malformed", () => {
    // "%" with no valid escape sequence throws inside decodeURIComponent.
    expect(parseStaticBadgeContent("bad%-value-green")).toEqual({
      label: "bad%",
      value: "value",
      color: "16a34a",
    })
  })

  it("expands a short hex color as the last segment", () => {
    // "4c1" (3-digit hex) expands to "44cc11" — same channel-doubling as brightgreen.
    expect(parseStaticBadgeContent("status-ok-4c1")).toEqual({
      label: "status",
      value: "ok",
      color: "44cc11",
    })
  })
})

describe("flag helpers", () => {
  it("isKnownFlagCode is case-insensitive and trims whitespace", () => {
    expect(isKnownFlagCode("us")).toBe(true)
    expect(isKnownFlagCode(" US ")).toBe(true)
    expect(isKnownFlagCode("US")).toBe(true)
  })

  it("isKnownFlagCode rejects an unrecognized code", () => {
    expect(isKnownFlagCode("zz-not-a-code")).toBe(false)
  })

  it("listFlagCodes returns a non-empty list containing common codes", () => {
    const codes = listFlagCodes()
    expect(codes.length).toBeGreaterThan(0)
    expect(codes).toContain("US")
  })

  it("getFlagBadge resolves a known code to its display name + CDN link", async () => {
    const badge = await getFlagBadge("us")
    expect(badge).not.toBeNull()
    expect(badge?.label).toBe("built in")
    expect(badge?.link).toContain("US.svg")
  })

  it("getFlagBadge falls back to a readable, capitalized label (no flag art) for an unknown code", async () => {
    // Fallback title-cases each whitespace-separated word — underscores are
    // left as-is (only spaces are treated as word boundaries).
    const badge = await getFlagBadge("not a real code")
    expect(badge).toEqual({ label: "built in", value: "Not A Real Code", color: "red" })
  })

  it("getFlagBadge returns null for an empty/whitespace-only code", async () => {
    expect(await getFlagBadge("   ")).toBeNull()
  })
})

describe("getDynamicJsonBadge", () => {
  beforeEach(() => {
    lookupMock.mockReset()
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function params(extra: Record<string, string>): URLSearchParams {
    return new URLSearchParams({ url: "https://example.com/data.json", query: "$.version", ...extra })
  }

  it("returns null when url or query is missing", async () => {
    expect(await getDynamicJsonBadge(new URLSearchParams({ url: "https://example.com/x" }))).toBeNull()
    expect(await getDynamicJsonBadge(new URLSearchParams({ query: "$.x" }))).toBeNull()
  })

  it("extracts the first JSONPath match as the badge value", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: "1.2.3" }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const badge = await getDynamicJsonBadge(params({ url: "https://example.com/data1.json" }))
    expect(badge).toEqual({ label: "custom", value: "1.2.3" })
  })

  it("applies prefix/suffix and a custom label", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: "1.2.3" }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const badge = await getDynamicJsonBadge(params({
      url: "https://example.com/data2.json",
      label: "ver",
      prefix: "v",
      suffix: "!",
    }))
    expect(badge).toEqual({ label: "ver", value: "v1.2.3!" })
  })

  it("stringifies an object match instead of returning [object Object]", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ nested: { a: 1 } }), { status: 200 }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const badge = await getDynamicJsonBadge(params({ url: "https://example.com/data3.json", query: "$.nested" }))
    expect(badge?.value).toBe(JSON.stringify({ a: 1 }))
  })

  it("returns a red error badge when the JSONPath query has no match", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ other: 1 }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const badge = await getDynamicJsonBadge(params({ url: "https://example.com/data4.json" }))
    expect(badge).toEqual({ label: "custom", value: "not found", color: "red", error: true })
  })

  it("returns a red error badge on a non-ok HTTP status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 404 }))
    vi.stubGlobal("fetch", fetchMock)

    const badge = await getDynamicJsonBadge(params({ url: "https://example.com/data5.json" }))
    expect(badge).toEqual({ label: "error", value: "404", color: "red", error: true })
  })

  it("returns a 'blocked url' error badge for an SSRF-blocked target, without ever calling fetch", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const badge = await getDynamicJsonBadge(params({ url: "http://169.254.169.254/latest/meta-data" }))
    expect(badge).toEqual({ label: "error", value: "blocked url", color: "red", error: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
