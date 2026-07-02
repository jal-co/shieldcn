// shieldcn — app/dev/social/page.tsx
// Server-side gate for the dev-only social-image composer: 404s outside
// development so the client bundle (which pulls in html-to-image) is never
// sent to a production visitor in the first place, not just hidden behind
// a client check after the JS already loaded.

import { notFound } from "next/navigation"
import DevSocialClient from "./social-client"

export default function DevSocialPage() {
  if (process.env.NODE_ENV !== "development") notFound()
  return <DevSocialClient />
}
