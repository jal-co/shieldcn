import { AnimatedHeader } from "@/components/animated-header"
import { GitHubStarsButton } from "@/components/github-stars-button"
import { HeaderGitHubButton } from "@/components/header-github-button"

/**
 * Server header — composes the async GitHub stars button (a server component)
 * and hands it to the client AnimatedHeader, which owns all entrance + scroll
 * motion.
 */
export function SiteHeader() {
  return (
    <AnimatedHeader
      githubButton={
        <HeaderGitHubButton className="shrink-0">
          <GitHubStarsButton
            owner="jal-co"
            repo="shieldcn"
            variant="primary"
            size="sm"
            showRepo
          />
        </HeaderGitHubButton>
      }
    />
  )
}
