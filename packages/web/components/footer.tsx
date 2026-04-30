import Link from "next/link"

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="flex flex-col gap-8 px-6 py-10 sm:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight"
            >
              shieldcn
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              Beautiful README badges styled as shadcn/ui buttons. A
              shields.io alternative with 6 variants, 16 themes, and 5,000+
              built-in icons.
            </p>
            <p className="text-xs text-muted-foreground">
              Analytics by{" "}
              <a
                href="https://openpanel.dev/open-source?utm_source=shieldcn.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                OpenPanel
              </a>
            </p>
            <p className="text-xs text-muted-foreground">
              Built with{" "}
              <a
                href="https://shadcncraft.com?utm_source=shieldcn.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                shadcncraft
              </a>
            </p>
          </div>

          <div className="flex gap-10 text-sm">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Product
              </p>
              <Link
                href="/docs"
                className="text-muted-foreground hover:text-foreground"
              >
                Documentation
              </Link>
              <Link
                href="/docs/api-reference"
                className="text-muted-foreground hover:text-foreground"
              >
                API Reference
              </Link>
              <Link
                href="/token-pool"
                className="text-muted-foreground hover:text-foreground"
              >
                Token Pool
              </Link>
              <Link
                href="/gen"
                className="text-muted-foreground hover:text-foreground"
              >
                Generator
              </Link>
              <Link
                href="/docs/skill"
                className="text-muted-foreground hover:text-foreground"
              >
                Agent Skill
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Community
              </p>
              <a
                href="https://github.com/jal-co/shieldcn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                GitHub
              </a>
              <a
                href="https://ui.justinlevine.me"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                jal-co/ui
              </a>
              <a
                href="/llms.txt"
                className="text-muted-foreground hover:text-foreground"
              >
                llms.txt
              </a>
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-foreground"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Built by{" "}
            <a
              href="https://justinlevine.me"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Justin Levine
            </a>
            . Inspired by{" "}
            <a href="https://shields.io" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">shields.io</a>
            {" "}&{" "}
            <a href="https://badgen.net" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">badgen.net</a>
.
          </p>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/jal-co/shieldcn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="GitHub"
            >
              <GitHubIcon className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
