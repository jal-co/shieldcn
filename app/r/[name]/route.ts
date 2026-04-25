/**
 * shieldcn
 * app/r/[name]/route.ts
 *
 * Dynamic registry route. Serves registry items at /r/{name}.json.
 * Tracks downloads via OpenPanel.
 */

import { type NextRequest, NextResponse } from "next/server"
import { notFound } from "next/navigation"
import { getAllItemNames, buildRegistryItemResponse } from "@/lib/registry"
import { trackEvent } from "@/lib/openpanel"

interface RouteParams {
  params: Promise<{ name: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { name } = await params

  if (!name.endsWith(".json")) {
    return NextResponse.json(
      { error: "Registry items must end with .json" },
      { status: 400 }
    )
  }

  const itemName = name.replace(".json", "")

  void trackEvent({
    name: "registry_download",
    data: { component: itemName },
  })

  try {
    const item = buildRegistryItemResponse(itemName)

    if (!item) {
      notFound()
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error(`Failed to serve registry item: ${itemName}`, error)
    notFound()
  }
}

export async function generateStaticParams() {
  const names = getAllItemNames()
  return names.map((name) => ({ name: `${name}.json` }))
}
