/**
 * shieldcn
 * app/api/admin/settings/route
 *
 * GET  — current admin-visible settings (admin only).
 * PUT  — update a boolean setting (admin only).
 * Body: { name: SettingName, value: boolean }
 */

import { NextResponse, type NextRequest } from "next/server"
import { getAdmin } from "@/lib/admin"
import { getBoolSetting, setBoolSetting, SETTINGS, type SettingName } from "@shieldcn/core/settings"

export async function GET() {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const showcaseBrandBadges = await getBoolSetting("showcaseBrandBadges")
  return NextResponse.json({ settings: { showcaseBrandBadges } })
}

export async function PUT(req: NextRequest) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const name = body?.name as SettingName
  const value = body?.value
  if (!name || !(name in SETTINGS) || typeof value !== "boolean") {
    return NextResponse.json({ error: "expected { name, value: boolean }" }, { status: 400 })
  }

  await setBoolSetting(name, value)
  return NextResponse.json({ ok: true, name, value })
}
