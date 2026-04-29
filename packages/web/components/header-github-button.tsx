// shieldcn — components/header-github-button.tsx
// Homepage-only wrapper for the header GitHub button CTA

"use client"

import { usePathname } from "next/navigation"
import { GitHubStarCta } from "@/components/github-star-cta"

export function HeaderGitHubButton({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const pathname = usePathname()

  if (pathname !== "/") {
    return <div className={className}>{children}</div>
  }

  return <GitHubStarCta className={className}>{children}</GitHubStarCta>
}
