/**
 * shieldcn CLI
 * src/detect.test
 *
 * `parseGithubUrl` gates every remote-inspect call — if it accepts the
 * wrong owner/repo (e.g. from a URL with an extra path segment or a
 * non-GitHub host) the CLI silently inspects/reports on the wrong repo.
 * `extractShieldsIoUrls` feeds the "existing badges found" migration
 * prompt. `inspectLocal`/`inspectRemote` (fs- and network-heavy) are left
 * for a follow-up — this covers the pure parsing surface, the highest
 * blast-radius-per-line part of this file.
 */

import { describe, it, expect } from "vitest"
import { parseGithubUrl, extractShieldsIoUrls } from "./detect.js"

describe("parseGithubUrl", () => {
  it("returns an error for an empty/whitespace-only input", () => {
    expect(parseGithubUrl("")).toEqual({ error: "URL is required" })
    expect(parseGithubUrl("   ")).toEqual({ error: "URL is required" })
  })

  it("parses a bare owner/repo shorthand", () => {
    expect(parseGithubUrl("facebook/react")).toEqual({
      owner: "facebook",
      repo: "react",
      url: "https://github.com/facebook/react",
    })
  })

  it("strips a trailing .git from the shorthand form", () => {
    expect(parseGithubUrl("facebook/react.git")).toEqual({
      owner: "facebook",
      repo: "react",
      url: "https://github.com/facebook/react",
    })
  })

  it("parses a full https://github.com URL", () => {
    expect(parseGithubUrl("https://github.com/facebook/react")).toEqual({
      owner: "facebook",
      repo: "react",
      url: "https://github.com/facebook/react",
    })
  })

  it("parses a bare github.com host with no scheme", () => {
    expect(parseGithubUrl("github.com/facebook/react")).toEqual({
      owner: "facebook",
      repo: "react",
      url: "https://github.com/facebook/react",
    })
  })

  it("ignores extra path segments beyond owner/repo (e.g. /tree/main)", () => {
    expect(parseGithubUrl("https://github.com/facebook/react/tree/main")).toEqual({
      owner: "facebook",
      repo: "react",
      url: "https://github.com/facebook/react",
    })
  })

  it("strips a trailing .git and trailing slash from a full URL", () => {
    expect(parseGithubUrl("https://github.com/facebook/react.git")).toEqual({
      owner: "facebook",
      repo: "react",
      url: "https://github.com/facebook/react",
    })
    expect(parseGithubUrl("https://github.com/facebook/react/")).toEqual({
      owner: "facebook",
      repo: "react",
      url: "https://github.com/facebook/react",
    })
  })

  it("rejects a non-github.com host", () => {
    expect(parseGithubUrl("https://gitlab.com/facebook/react")).toEqual({
      error: "URL must be a github.com repository",
    })
  })

  it("rejects a github.com URL with fewer than 2 path segments", () => {
    expect(parseGithubUrl("https://github.com/facebook")).toEqual({
      error: "Could not parse owner/repo from URL",
    })
  })

  it("rejects garbage that isn't owner/repo shorthand and isn't a valid URL", () => {
    // No slash → doesn't match the shorthand regex; "not a url" also isn't a
    // parseable URL even with the https:// prefix this function adds.
    const result = parseGithubUrl("not a url")
    expect(result).toHaveProperty("error")
  })
})

describe("extractShieldsIoUrls", () => {
  it("finds every distinct shields.io URL in a README blob", () => {
    const readme = `
      # Title
      ![npm](https://img.shields.io/npm/v/react)
      ![stars](https://img.shields.io/github/stars/facebook/react)
    `
    expect(extractShieldsIoUrls(readme)).toEqual([
      "https://img.shields.io/npm/v/react",
      "https://img.shields.io/github/stars/facebook/react",
    ])
  })

  it("deduplicates repeated URLs", () => {
    const readme = "a https://img.shields.io/npm/v/react b https://img.shields.io/npm/v/react"
    expect(extractShieldsIoUrls(readme)).toEqual(["https://img.shields.io/npm/v/react"])
  })

  it("returns an empty array when there are none", () => {
    expect(extractShieldsIoUrls("no badges here")).toEqual([])
  })

  it("doesn't capture a trailing markdown/HTML delimiter into the URL", () => {
    const readme = '![b](https://img.shields.io/npm/v/react) <img src="https://img.shields.io/github/stars/a/b">'
    expect(extractShieldsIoUrls(readme)).toEqual([
      "https://img.shields.io/npm/v/react",
      "https://img.shields.io/github/stars/a/b",
    ])
  })
})
