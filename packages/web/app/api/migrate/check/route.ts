/**
 * shieldcn
 * app/api/migrate/check/route
 *
 * POST — Check if the GitHub App is installed on a repo and fetch its README.
 *
 * Body: { owner: string, repo: string }
 *
 * Returns:
 *   - { installed: true, readme, result } if installed
 *   - { installed: false, installUrl } if not installed
 */

import { NextRequest, NextResponse } from "next/server"
import { transformReadme } from "@shieldcn/core/migrate"
import {
  getInstallationForRepo,
  getInstallationToken,
  getAppInstallUrl,
  gh,
} from "../github-app"

export async function POST(req: NextRequest) {
  if (!process.env.GITHUB_APP_ID) {
    return NextResponse.json(
      { error: "Migration tool not configured" },
      { status: 503 },
    )
  }

  const body = await req.json()
  const { owner, repo } = body

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo are required" },
      { status: 400 },
    )
  }

  try {
    // 1. Check if App is installed on this repo
    const installationId = await getInstallationForRepo(owner, repo)

    if (!installationId) {
      return NextResponse.json({
        installed: false,
        installUrl: getAppInstallUrl(owner, repo),
      })
    }

    // 2. Get installation token
    const token = await getInstallationToken(installationId, owner, repo)

    // 3. Fetch README
    let readmeContent: string
    let readmePath: string
    let readmeSha: string

    try {
      const readmeData = await gh(
        token,
        `/repos/${owner}/${repo}/readme`,
      )
      readmeContent = Buffer.from(readmeData.content, "base64").toString("utf-8")
      readmePath = readmeData.path
      readmeSha = readmeData.sha
    } catch {
      return NextResponse.json(
        { error: "Could not fetch README. Make sure the repository has a README.md file." },
        { status: 404 },
      )
    }

    // 4. Transform
    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://shieldcn.dev"
    const result = transformReadme(readmeContent, baseUrl)

    return NextResponse.json({
      installed: true,
      installationId,
      readme: {
        path: readmePath,
        sha: readmeSha,
        content: readmeContent,
      },
      result: {
        transformed: result.transformed,
        badges: result.badges,
        found: result.found,
        transformed_count: result.transformed_count,
        skipped: result.skipped,
      },
    })
  } catch (err) {
    console.error("Migration check error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to check repo" },
      { status: 500 },
    )
  }
}
