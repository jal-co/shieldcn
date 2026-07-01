/**
 * shieldcn
 * lib/builder-output.test
 */

import { describe, it, expect } from "vitest"
import { formatImageOutput } from "./builder-output"

const URL = "https://shieldcn.dev/header/gradient.svg"

describe("formatImageOutput", () => {
  it("formats a bare markdown image with no link", () => {
    expect(formatImageOutput(URL, "markdown", "header")).toBe(`![header](${URL})`)
  })

  it("wraps a markdown image in a link when link is given", () => {
    expect(formatImageOutput(URL, "markdown", "header", "https://example.com")).toBe(
      `[![header](${URL})](https://example.com)`,
    )
  })

  it("formats a bare HTML <img> with no link", () => {
    expect(formatImageOutput(URL, "html", "header")).toBe(`<img alt="header" src="${URL}">`)
  })

  it("wraps an HTML <img> in an <a> when link is given", () => {
    expect(formatImageOutput(URL, "html", "header", "https://example.com")).toBe(
      `<a href="https://example.com"><img alt="header" src="${URL}" /></a>`,
    )
  })

  it("returns the bare URL for the 'url' format regardless of link/alt", () => {
    expect(formatImageOutput(URL, "url", "header", "https://example.com")).toBe(URL)
  })
})
