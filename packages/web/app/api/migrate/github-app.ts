/**
 * shieldcn
 * app/api/migrate/github-app.ts
 *
 * Shared GitHub App utilities for the migrate flow.
 * Uses the same App credentials as the showcase submission flow.
 *
 * The migrate flow needs the App to be installed on the TARGET repo
 * (the user's repo), not just on jal-co/shieldcn. We request an
 * installation token scoped to the target repo.
 */

import { SignJWT, importPKCS8 } from "jose"

// ---------------------------------------------------------------------------
// JWT generation (same as showcase route)
// ---------------------------------------------------------------------------

export async function generateAppJWT(): Promise<string> {
  const appId = process.env.GITHUB_APP_ID
  const privateKeyB64 = process.env.GITHUB_APP_PRIVATE_KEY

  if (!appId || !privateKeyB64) {
    throw new Error("GitHub App not configured")
  }

  const privateKeyPem = Buffer.from(privateKeyB64, "base64").toString("utf-8")
  const privateKey = await importPKCS8(privateKeyPem, "RS256")

  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 600)
    .setIssuer(appId)
    .sign(privateKey)
}

// ---------------------------------------------------------------------------
// Find installation for a repo
// ---------------------------------------------------------------------------

/**
 * Check if the GitHub App is installed on a given repo.
 * Returns the installation ID if installed, null otherwise.
 */
export async function getInstallationForRepo(
  owner: string,
  repo: string,
): Promise<number | null> {
  const jwt = await generateAppJWT()

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/installation`,
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  )

  if (res.status === 404) return null
  if (!res.ok) return null

  const data = await res.json()
  return data.id
}

// ---------------------------------------------------------------------------
// Get installation token scoped to a repo
// ---------------------------------------------------------------------------

export async function getInstallationToken(
  installationId: number,
  owner: string,
  repo: string,
): Promise<string> {
  const jwt = await generateAppJWT()

  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repositories: [repo],
        permissions: {
          contents: "write",
          pull_requests: "write",
        },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "unknown" }))
    throw new Error(`Failed to get installation token: ${err.message}`)
  }

  const data = await res.json()
  return data.token
}

// ---------------------------------------------------------------------------
// GitHub API helper
// ---------------------------------------------------------------------------

export async function gh(
  token: string,
  path: string,
  opts: RequestInit = {},
) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...opts.headers,
    },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `GitHub API ${res.status}`)
  return data
}

// ---------------------------------------------------------------------------
// Get the App's install URL for a specific repo
// ---------------------------------------------------------------------------

export function getAppInstallUrl(owner: string, repo: string): string {
  const appSlug = process.env.GITHUB_APP_SLUG || "shieldcn-dev"
  // GitHub App install flow — redirect_uri brings them back to /migrate after install
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://shieldcn.dev"
  const state = encodeURIComponent(`${owner}/${repo}`)
  return `https://github.com/apps/${appSlug}/installations/select_target?state=${state}`
}
