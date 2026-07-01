/**
 * shieldcn
 * safe-fetch.test
 *
 * Locks in the SSRF guard: private/loopback/link-local/metadata addresses
 * are rejected on the initial host and on every redirect hop, and oversized
 * responses are rejected (via Content-Length or mid-stream).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }))
vi.mock("node:dns/promises", () => ({ lookup: lookupMock }))

import { assertPublicUrl, safeFetch, UnsafeUrlError, ResponseTooLargeError } from "./safe-fetch"

beforeEach(() => {
  lookupMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("assertPublicUrl", () => {
  it("rejects non-http(s) protocols", async () => {
    await expect(assertPublicUrl("ftp://example.com/x")).rejects.toThrow(UnsafeUrlError)
  })

  it("rejects an invalid URL", async () => {
    await expect(assertPublicUrl("not a url")).rejects.toThrow(UnsafeUrlError)
  })

  it("rejects localhost", async () => {
    await expect(assertPublicUrl("http://localhost/x")).rejects.toThrow(UnsafeUrlError)
    await expect(assertPublicUrl("http://sub.localhost/x")).rejects.toThrow(UnsafeUrlError)
  })

  it("rejects private/loopback/link-local/metadata IPv4 literals", async () => {
    const blocked = ["10.0.0.1", "127.0.0.1", "169.254.169.254", "192.168.1.1", "172.16.0.5", "0.0.0.0", "100.64.0.1"]
    for (const ip of blocked) {
      await expect(assertPublicUrl(`http://${ip}/`)).rejects.toThrow(UnsafeUrlError)
    }
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it("accepts a public IPv4 literal without a DNS lookup", async () => {
    const url = await assertPublicUrl("http://93.184.216.34/")
    expect(url.hostname).toBe("93.184.216.34")
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it("rejects IPv6 loopback and link-local literals", async () => {
    await expect(assertPublicUrl("http://[::1]/")).rejects.toThrow(UnsafeUrlError)
    await expect(assertPublicUrl("http://[fe80::1]/")).rejects.toThrow(UnsafeUrlError)
    await expect(assertPublicUrl("http://[fc00::1]/")).rejects.toThrow(UnsafeUrlError)
  })

  it("rejects an IPv4-mapped IPv6 literal that maps to a private address", async () => {
    await expect(assertPublicUrl("http://[::ffff:127.0.0.1]/")).rejects.toThrow(UnsafeUrlError)
  })

  it("rejects a hostname that resolves to a private address (DNS-rebinding style bypass)", async () => {
    lookupMock.mockResolvedValue([{ address: "127.0.0.1", family: 4 }])
    await expect(assertPublicUrl("http://evil.example.com/")).rejects.toThrow(UnsafeUrlError)
  })

  it("rejects when ANY resolved address is private, even if others are public", async () => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ])
    await expect(assertPublicUrl("http://mixed.example.com/")).rejects.toThrow(UnsafeUrlError)
  })

  it("accepts a hostname that resolves only to public addresses", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])
    const url = await assertPublicUrl("http://example.com/")
    expect(url.hostname).toBe("example.com")
  })

  it("rejects when DNS resolution fails", async () => {
    lookupMock.mockRejectedValue(new Error("ENOTFOUND"))
    await expect(assertPublicUrl("http://nonexistent.invalid/")).rejects.toThrow(UnsafeUrlError)
  })

  describe("SHIELDCN_ALLOW_PRIVATE_FETCH escape hatch", () => {
    const ORIGINAL = process.env.SHIELDCN_ALLOW_PRIVATE_FETCH

    afterEach(() => {
      if (ORIGINAL === undefined) delete process.env.SHIELDCN_ALLOW_PRIVATE_FETCH
      else process.env.SHIELDCN_ALLOW_PRIVATE_FETCH = ORIGINAL
    })

    it("allows a private IP when explicitly opted in", async () => {
      process.env.SHIELDCN_ALLOW_PRIVATE_FETCH = "true"
      const url = await assertPublicUrl("http://169.254.169.254/latest/meta-data")
      expect(url.hostname).toBe("169.254.169.254")
    })

    it("still enforces the protocol allowlist even when opted in", async () => {
      process.env.SHIELDCN_ALLOW_PRIVATE_FETCH = "true"
      await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow(UnsafeUrlError)
    })

    it("does not affect requests when unset", async () => {
      delete process.env.SHIELDCN_ALLOW_PRIVATE_FETCH
      await expect(assertPublicUrl("http://127.0.0.1/")).rejects.toThrow(UnsafeUrlError)
    })
  })
})

describe("safeFetch", () => {
  it("rejects before calling fetch when the host is private", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    await expect(safeFetch("http://127.0.0.1/admin")).rejects.toThrow(UnsafeUrlError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("follows a redirect to a public host and returns the final response", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: "https://example.com/final" } }),
      )
      .mockResolvedValueOnce(new Response("ok", { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const res = await safeFetch("https://example.com/start")
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("ok")
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("blocks a redirect into a private/metadata address", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(safeFetch("https://example.com/start")).rejects.toThrow(UnsafeUrlError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("caps the number of redirect hops", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://example.com/loop" } }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(safeFetch("https://example.com/start", { maxRedirects: 2 })).rejects.toThrow(/too many redirects/)
    expect(fetchMock).toHaveBeenCalledTimes(3) // initial + 2 redirects, then the 3rd redirect exceeds the cap
  })

  it("rejects via Content-Length before reading the body", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])
    const body = "x".repeat(150)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(body, { status: 200, headers: { "content-length": String(body.length) } }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(safeFetch("https://example.com/big", { maxBytes: 100 })).rejects.toThrow(ResponseTooLargeError)
  })

  it("aborts a streamed body that exceeds maxBytes with no Content-Length header", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(60))
        controller.enqueue(new Uint8Array(60))
        controller.close()
      },
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const res = await safeFetch("https://example.com/stream", { maxBytes: 100 })
    await expect(res.arrayBuffer()).rejects.toThrow(ResponseTooLargeError)
  })

  it("passes through a response within the size limit", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])
    const fetchMock = vi.fn().mockResolvedValue(new Response("small body", { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const res = await safeFetch("https://example.com/small", { maxBytes: 1000 })
    expect(await res.text()).toBe("small body")
  })
})
