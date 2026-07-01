/**
 * shieldcn
 * src/safe-fetch
 *
 * SSRF-hardened fetch for URLs supplied by badge callers (dynamic JSON
 * badges, the `/https` proxy, chart `?url=`, header `?logo=`/`?image=`, and
 * instance-host providers like Mastodon/Lemmy/Discourse/Matrix/Weblate/Sonar
 * where the hostname itself is attacker-controlled).
 *
 * Trusted, hardcoded-host provider calls (npm, GitHub, PyPI, ...) do NOT go
 * through this — only requests where a remote user chose the host or URL.
 */

import { lookup as dnsLookup } from "node:dns/promises"
import { isIP } from "node:net"

const DEFAULT_MAX_BYTES = 5_000_000 // 5 MB
const DEFAULT_MAX_REDIRECTS = 5
const DEFAULT_TIMEOUT_MS = 8_000

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "UnsafeUrlError"
  }
}

export class ResponseTooLargeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ResponseTooLargeError"
  }
}

/** True for an IPv4 address inside a private, loopback, link-local, or otherwise non-public range. */
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true
  const [a, b] = parts
  if (a === 0) return true // 0.0.0.0/8
  if (a === 10) return true // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 (CGNAT)
  if (a === 127) return true // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true // 169.254.0.0/16 (link-local, incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 0) return true // 192.0.0.0/24, 192.0.2.0/24 (IETF / TEST-NET-1)
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15 (benchmark)
  if (a === 198 && b === 51) return true // 198.51.100.0/24 (TEST-NET-2)
  if (a === 203 && b === 0) return true // 203.0.113.0/24 (TEST-NET-3)
  if (a >= 224) return true // 224.0.0.0/4 multicast, 240.0.0.0/4 reserved, 255.255.255.255 broadcast
  return false
}

/** True for an IPv6 address inside a private, loopback, link-local, or otherwise non-public range. */
function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase()
  if (normalized === "::1" || normalized === "::") return true // loopback / unspecified
  if (normalized.startsWith("fe80:") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true // fe80::/10 link-local
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true // fc00::/7 unique local

  // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded IPv4 instead. The
  // WHATWG URL parser canonicalizes the mapped address into two hex hextets
  // (e.g. `::ffff:127.0.0.1` becomes `::ffff:7f00:1`) rather than keeping the
  // dotted-decimal form, so both representations must be handled.
  const mappedDotted = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mappedDotted) return isPrivateIpv4(mappedDotted[1])
  const mappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16)
    const lo = parseInt(mappedHex[2], 16)
    const dotted = [(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff].join(".")
    return isPrivateIpv4(dotted)
  }

  if (normalized.startsWith("2001:db8:")) return true // documentation range
  if (normalized.startsWith("64:ff9b::")) return true // NAT64
  return false
}

function isPrivateIp(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return isPrivateIpv4(ip)
  if (version === 6) return isPrivateIpv6(ip)
  return true // not a recognizable IP literal — treat conservatively
}

/**
 * Escape hatch for self-hosted deployments that intentionally want a badge to
 * reach an internal endpoint (e.g. a corporate intranet status page). Unset
 * (the default) keeps the SSRF guard fully enforced — set only if you
 * understand the badge route then becomes a proxy into your private network.
 */
function privateFetchAllowed(): boolean {
  return process.env.SHIELDCN_ALLOW_PRIVATE_FETCH === "true"
}

/**
 * Reject a URL whose hostname is (or resolves to) a private, loopback,
 * link-local, or cloud-metadata address. Throws {@link UnsafeUrlError}.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new UnsafeUrlError("invalid URL")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError(`unsupported protocol: ${url.protocol}`)
  }

  if (privateFetchAllowed()) return url

  const hostname = url.hostname
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "metadata.google.internal") {
    throw new UnsafeUrlError(`blocked host: ${hostname}`)
  }

  // WHATWG URL keeps brackets around an IPv6 hostname (`[::1]`), but
  // `net.isIP`/our range checks expect the bare address.
  const bareHost = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname

  // Hostname is already a literal IP — check it directly, no DNS needed.
  if (isIP(bareHost)) {
    if (isPrivateIp(bareHost)) throw new UnsafeUrlError(`blocked private IP: ${bareHost}`)
    return url
  }

  // Resolve DNS and reject if ANY returned address is private — prevents
  // DNS-rebinding style bypasses where a public-looking hostname resolves to
  // an internal address.
  let addresses: { address: string }[]
  try {
    addresses = await dnsLookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new UnsafeUrlError(`could not resolve host: ${hostname}`)
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new UnsafeUrlError(`host resolves to a blocked address: ${hostname}`)
  }

  return url
}

export interface SafeFetchOptions {
  headers?: HeadersInit
  timeoutMs?: number
  maxBytes?: number
  maxRedirects?: number
}

/**
 * Fetch a caller-supplied URL with SSRF hardening: rejects private/loopback/
 * link-local/metadata addresses (checked on the initial host and again on
 * every redirect hop, so a public host can't redirect into an internal one),
 * caps redirects, enforces a hard timeout, and caps the response body size
 * (aborting the read once the cap is exceeded rather than buffering an
 * unbounded body). Throws {@link UnsafeUrlError} or {@link ResponseTooLargeError}
 * on violation — callers should catch and treat like any other fetch failure.
 */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<Response> {
  const {
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
  } = opts

  let currentUrl = rawUrl
  let response: Response | null = null

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(currentUrl)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      response = await fetch(currentUrl, {
        headers,
        redirect: "manual",
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) return response
      currentUrl = new URL(location, currentUrl).toString()
      continue
    }

    return capBodySize(response, maxBytes)
  }

  throw new UnsafeUrlError("too many redirects")
}

/** Wrap a Response so its body read aborts with {@link ResponseTooLargeError} past `maxBytes`. */
function capBodySize(response: Response, maxBytes: number): Response {
  const contentLength = response.headers.get("content-length")
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new ResponseTooLargeError(`response too large: ${contentLength} bytes`)
  }
  if (!response.body) return response

  let received = 0
  const reader = response.body.getReader()
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        controller.close()
        return
      }
      received += value.byteLength
      if (received > maxBytes) {
        controller.error(new ResponseTooLargeError(`response exceeded ${maxBytes} bytes`))
        reader.cancel()
        return
      }
      controller.enqueue(value)
    },
    cancel(reason) {
      reader.cancel(reason)
    },
  })

  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
