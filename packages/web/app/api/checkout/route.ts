/**
 * shieldcn
 * app/api/checkout/route.ts
 *
 * Polar checkout entry point. Redirects to a hosted Polar checkout for the
 * Plus product. The owner id is passed through so the webhook can attribute
 * the resulting subscription to the right tenant.
 *
 * Usage: /api/checkout?plan=plus
 */

import { Checkout } from "@polar-sh/nextjs"
import { NextResponse, NextRequest } from "next/server"
import { requireOwner } from "@/lib/auth"

const accessToken = process.env.POLAR_ACCESS_TOKEN
const server = (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox"
const PRODUCTS: Record<string, string | undefined> = {
  plus: process.env.POLAR_PRODUCT_PLUS,
}

const successUrl = `${process.env.NEXT_PUBLIC_URL ?? "https://shieldcn.dev"}/dashboard?checkout=success`

export async function GET(req: NextRequest) {
  if (!accessToken) {
    return NextResponse.json({ error: "billing not configured" }, { status: 503 })
  }

  const auth = await requireOwner()
  if (!auth) {
    const login = new URL("/sign-in", req.url)
    return NextResponse.redirect(login)
  }

  const plan = req.nextUrl.searchParams.get("plan") ?? "plus"
  const productId = PRODUCTS[plan]
  if (!productId) {
    return NextResponse.json({ error: `unknown plan: ${plan}` }, { status: 400 })
  }

  // Delegate to Polar's handler, injecting our product + tenant metadata.
  const handler = Checkout({
    accessToken,
    server,
    successUrl,
    theme: "dark",
  })

  // Rewrite the request so Polar's handler sees the product + external ids.
  const url = new URL(req.url)
  url.searchParams.set("products", productId)
  url.searchParams.set("customerExternalId", auth.ownerId)
  // The handler parses `metadata` as a single JSON object param.
  url.searchParams.set("metadata", JSON.stringify({ ownerId: auth.ownerId, plan }))

  return handler(new NextRequest(url, req))
}
