/**
 * shieldcn
 * app/api/showcase/route
 *
 * POST — Creates a GitHub PR that adds a community badge to showcase-data.ts.
 *
 * Uses a GitHub App installation token to:
 * 1. Branch from main
 * 2. Edit lib/showcase-data.ts to add the badge to the Community category
 * 3. Open a PR for review
 *
 * PRs are authored by shieldcn-dev[bot].
 *
 * Env vars:
 *   GITHUB_APP_ID — GitHub App ID
 *   GITHUB_APP_INSTALLATION_ID — Installation ID on jal-co/shieldcn
 *   GITHUB_APP_PRIVATE_KEY — Base64-encoded .pem private key
 */

import { NextRequest, NextResponse } from "next/server"
import { SignJWT, importPKCS8 } from "jose"

const OWNER = "jal-co"
const REPO = "shieldcn"
const FILE_PATH = "lib/showcase-data.ts"
const BRANCH_PREFIX = "community-badge"

// ---------------------------------------------------------------------------
// GitHub App auth — generate an installation token
// ---------------------------------------------------------------------------

async function getInstallationToken(): Promise<string> {
  const appId = process.env.GITHUB_APP_ID
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID
  const privateKeyB64 = process.env.GITHUB_APP_PRIVATE_KEY

  if (!appId || !installationId || !privateKeyB64) {
    throw new Error("GitHub App not configured")
  }

  const privateKeyPem = Buffer.from(privateKeyB64, "base64").toString("utf-8")
  const privateKey = await importPKCS8(privateKeyPem, "RS256")

  const now = Math.floor(Date.now() / 1000)
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 600)
    .setIssuer(appId)
    .sign(privateKey)

  // Exchange JWT for an installation access token
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Failed to get installation token: ${err.message}`)
  }

  const data = await res.json()
  return data.token
}

// ---------------------------------------------------------------------------
// GitHub API helper
// ---------------------------------------------------------------------------

async function gh(token: string, path: string, opts: RequestInit = {}) {
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
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (!process.env.GITHUB_APP_ID) {
    return NextResponse.json({ error: "Showcase submissions not configured" }, { status: 503 })
  }

  const body = await req.json()
  const { badgePath, title, description, githubUser } = body

  if (!badgePath || typeof badgePath !== "string") {
    return NextResponse.json({ error: "badgePath is required" }, { status: 400 })
  }
  if (!title || typeof title !== "string" || title.length > 100) {
    return NextResponse.json({ error: "title is required (max 100 chars)" }, { status: 400 })
  }
  if (description && typeof description === "string" && description.length > 280) {
    return NextResponse.json({ error: "description max 280 chars" }, { status: 400 })
  }
  if (githubUser && typeof githubUser === "string" && githubUser.length > 39) {
    return NextResponse.json({ error: "githubUser max 39 chars" }, { status: 400 })
  }

  try {
    const token = await getInstallationToken()

    // 1. Get the SHA of main
    const mainRef = await gh(token, `/repos/${OWNER}/${REPO}/git/ref/heads/main`)
    const mainSha = mainRef.object.sha

    // 2. Create a branch
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40)
    const branchName = `${BRANCH_PREFIX}/${slug}-${Date.now().toString(36)}`

    await gh(token, `/repos/${OWNER}/${REPO}/git/refs`, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: mainSha,
      }),
    })

    // 3. Get current file contents
    const file = await gh(token, `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${branchName}`)
    const content = Buffer.from(file.content, "base64").toString("utf-8")

    // 4. Build the new badge entry
    const safeTitle = title.trim().replace(/"/g, '\\"')
    const safeDesc = (description?.trim() || `Community badge submitted by ${githubUser || "anonymous"}.`).replace(/"/g, '\\"')
    const safeUser = githubUser?.trim().replace(/^@/, "") || ""
    const subtitle = safeUser ? `by @${safeUser}` : "community"

    const newEntry = `  dynamicBadge("${safeTitle}", "${subtitle}", "${badgePath}", "${safeDesc}"),`

    // 5. Insert into the Community category, or create it
    let updatedContent: string

    const communityMarker = `name: "Community"`
    if (content.includes(communityMarker)) {
      // Find the icons array in the Community category and append
      const communityIdx = content.indexOf(communityMarker)
      const iconsStart = content.indexOf("icons: [", communityIdx)
      const insertPoint = content.indexOf("]", iconsStart)
      const before = content.slice(0, insertPoint)
      const after = content.slice(insertPoint)
      const needsComma = before.trimEnd().endsWith(")") || before.trimEnd().endsWith(",")
      updatedContent = before + (needsComma && !before.trimEnd().endsWith(",") ? "," : "") + "\n    " + newEntry + "\n    " + after
    } else {
      // Add a new Community category at the end of the categories array
      const closingBracket = content.lastIndexOf("]")
      const communityCategory = `  {
    name: "Community",
    description: "Badges submitted by the community. Submit yours with the button on the showcase page!",
    icons: [
    ${newEntry}
    ],
  },\n`
      updatedContent = content.slice(0, closingBracket) + communityCategory + content.slice(closingBracket)
    }

    // 6. Commit the change
    const newContentBase64 = Buffer.from(updatedContent).toString("base64")

    await gh(token, `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `feat(showcase): add community badge "${safeTitle}"`,
        content: newContentBase64,
        sha: file.sha,
        branch: branchName,
      }),
    })

    // 7. Open a PR
    const prBody = [
      `## Community Badge Submission`,
      ``,
      `**Badge:** \`${badgePath}\``,
      `**Title:** ${safeTitle}`,
      description ? `**Description:** ${safeDesc}` : "",
      safeUser ? `**Submitted by:** @${safeUser}` : "**Submitted by:** anonymous",
      ``,
      `### Preview`,
      ``,
      `![${safeTitle}](https://shieldcn.dev${badgePath})`,
      ``,
      `---`,
      `*Submitted via the [shieldcn showcase](https://shieldcn.dev/showcase) badge builder.*`,
    ].filter(Boolean).join("\n")

    const pr = await gh(token, `/repos/${OWNER}/${REPO}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: `feat(showcase): community badge — ${safeTitle}`,
        body: prBody,
        head: branchName,
        base: "main",
      }),
    })

    return NextResponse.json({
      success: true,
      prUrl: pr.html_url,
      prNumber: pr.number,
    })
  } catch (err) {
    console.error("Showcase submission error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create PR" },
      { status: 500 }
    )
  }
}
