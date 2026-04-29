// shieldcn — lib/gen/proxy-fetch.ts
// Client-side fetch wrapper that routes GitHub/npm requests through
// the server-side proxy to use the token pool.

const PROXY_HOSTS = [
  "api.github.com",
  "raw.githubusercontent.com",
  "registry.npmjs.org",
]

function shouldProxy(url: string): boolean {
  try {
    const parsed = new URL(url)
    return PROXY_HOSTS.includes(parsed.hostname)
  } catch {
    return false
  }
}

export async function proxyFetch(
  url: string,
  signal?: AbortSignal,
): Promise<Response> {
  if (!shouldProxy(url)) {
    return fetch(url, { signal })
  }

  const res = await fetch("/api/gen-inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, method: "GET" }),
    signal,
  })

  const body = await res.json()

  if (!body.ok) {
    return new Response(null, { status: body.status ?? res.status })
  }

  // Return a Response-like object with the proxied data
  const text = typeof body.data === "string" ? body.data : JSON.stringify(body.data)
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": typeof body.data === "string" ? "text/plain" : "application/json" },
  })
}

export async function proxyHead(
  url: string,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!shouldProxy(url)) {
    try {
      const res = await fetch(url, { method: "HEAD", signal })
      return res.ok
    } catch {
      return false
    }
  }

  try {
    const res = await fetch("/api/gen-inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, method: "HEAD" }),
      signal,
    })
    const body = await res.json()
    return body.ok === true
  } catch {
    return false
  }
}
