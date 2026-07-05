import Link from "next/link"
import { ShieldcnLogo } from "@/components/shieldcn-logo"

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground transition-colors hover:text-foreground"
      aria-label={label}
    >
      {children}
    </a>
  )
}

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function YouTubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}


const footerLinks = {
  community: [
    { label: "GitHub", href: "https://github.com/jal-co/shieldcn", external: true },
    { label: "jal-co/ui", href: "https://ui.justinlevine.me", external: true },
    { label: "Stats", href: "/stats", external: false },
    { label: "llms.txt", href: "/llms.txt", external: false },
    { label: "Privacy", href: "/privacy", external: false },
    { label: "Contact", href: "mailto:shieldcn@fwdtojustin.com", external: true },
  ],
  product: [
    { label: "Documentation", href: "/docs", external: false },
    { label: "API Reference", href: "/docs/api-reference", external: false },
    { label: "Token Pool", href: "/token-pool", external: false },
    { label: "Generator", href: "/gen", external: false },
    { label: "Agent Skill", href: "/docs/skill", external: false },
  ],
}

function FooterLink({ href, label, external }: { href: string; label: string; external: boolean }) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
      </a>
    )
  }
  return (
    <Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
      {label}
    </Link>
  )
}

function FooterColumn({ title, links }: { title: string; links: typeof footerLinks.community }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm text-foreground">{title}</p>
      {links.map((link) => (
        <FooterLink key={link.label} {...link} />
      ))}
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="px-6 py-10 sm:px-10">
      <div className="flex flex-col gap-8">
        {/* Main content */}
        <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
          {/* Left — branding */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2">
              <ShieldcnLogo className="h-9 w-auto" />
              <span className="text-sm font-heading font-semibold">shieldcn</span>
            </Link>

            <p className="text-sm text-muted-foreground">
              Member of the{" "}
              <a
                href="https://vercel.com/oss"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground"
              >
                Vercel OSS Program
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              Analytics provided by{" "}
              <a
                href="https://openpanel.dev/open-source?utm_source=shieldcn.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground"
              >
                OpenPanel
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              Monitored by{" "}
              <a
                href="https://sentry.io/?utm_source=shieldcn.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground"
              >
                Sentry
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              Powered by{" "}
              <a
                href="https://neon.com/?utm_source=shieldcn.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground"
              >
                Neon
              </a>
              .
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3 pt-1">
              <SocialIcon href="https://x.com/jalcowastaken" label="X (Twitter)">
                <XIcon className="size-4" />
              </SocialIcon>
              <SocialIcon href="https://youtube.com/@jalco-on-youtube" label="YouTube">
                <YouTubeIcon className="size-4" />
              </SocialIcon>
              <SocialIcon href="https://discord.gg/KFcxcVQDnr" label="Discord">
                <DiscordIcon className="size-4" />
              </SocialIcon>
              <SocialIcon href="https://github.com/jal-co/shieldcn" label="GitHub">
                <GitHubIcon className="size-4" />
              </SocialIcon>
            </div>
          </div>

          {/* Right — link columns */}
          <div className="flex gap-16">
            <FooterColumn title="Community" links={footerLinks.community} />
            <FooterColumn title="Product" links={footerLinks.product} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-2 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            inspired by{" "}
            <a href="https://shields.io" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">shields.io</a>
            {" "}and{" "}
            <a href="https://badgen.net" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">badgen.net</a>
          </p>
          <p>
            Made with{" "}
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" className="inline-block -mt-px"><path fill="#ef4444" d="m12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53z"/></svg>
            {" "}in{" "}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="10" viewBox="0 0 32 24" className="inline-block -mt-px rounded-sm"><g fill="none"><path fill="#f7fcff" fillRule="evenodd" d="M0 0h32v24H0z" clipRule="evenodd"/><path fill="#e31d1c" fillRule="evenodd" d="M0 14.667v2h32v-2zm0 3.666v2h32v-2zm0-11v2h32v-2zM0 22v2h32v-2zm0-11v2h32v-2zM0 0v2h32V0zm0 3.667v2h32v-2z" clipRule="evenodd"/><path fill="#2e42a5" d="M0 0h20v13H0z"/><path fill="#f7fcff" fillRule="evenodd" d="m1.722 2.939l-.726.509l.245-.906l-.645-.574h.843l.282-.74l.331.74h.718l-.564.574l.218.906zm4 0l-.726.509l.245-.906l-.644-.574h.842l.282-.74l.331.74h.718l-.564.574l.218.906zm3.274.509l.726-.51l.702.51l-.218-.906l.564-.574h-.718l-.331-.74l-.282.74h-.842l.644.574zm4.726-.51l-.726.51l.245-.906l-.644-.574h.842l.282-.74l.331.74h.718l-.564.574l.218.906zM.996 7.449l.726-.51l.702.51l-.218-.906l.564-.574h-.718l-.331-.74l-.282.74H.596l.645.574zm4.726-.51l-.726.51l.245-.906l-.644-.574h.842l.282-.74l.331.74h.718l-.564.574l.218.906zm3.274.51l.726-.51l.702.51l-.218-.906l.564-.574h-.718l-.331-.74l-.282.74h-.842l.644.574zm4.726-.51l-.726.51l.245-.906l-.644-.574h.842l.282-.74l.331.74h.718l-.564.574l.218.906zM.996 11.449l.726-.51l.702.51l-.218-.906l.564-.574h-.718l-.331-.74l-.282.74H.596l.645.574zm4.726-.51l-.726.51l.245-.906l-.644-.574h.842l.282-.74l.331.74h.718l-.564.574l.218.906zm3.274.51l.726-.51l.702.51l-.218-.906l.564-.574h-.718l-.331-.74l-.282.74h-.842l.644.574zm4.726-.51l-.726.51l.245-.906l-.644-.574h.842l.282-.74l.331.74h.718l-.564.574l.218.906zm3.274-7.49l.726-.51l.702.51l-.218-.906l.564-.574h-.718l-.331-.74l-.282.74h-.843l.645.574zm.726 3.49l-.726.51l.245-.906l-.645-.574h.843l.282-.74l.331.74h.718l-.564.574l.218.906zm-.726 4.51l.726-.51l.702.51l-.218-.906l.564-.574h-.718l-.331-.74l-.282.74h-.843l.645.574zM3.722 4.938l-.726.51l.245-.906l-.645-.574h.843l.282-.74l.331.74h.718l-.564.574l.218.906zm3.274.51l.726-.51l.702.51l-.218-.906l.564-.574h-.718l-.331-.74l-.282.74h-.843l.645.574zm4.726-.51l-.726.51l.245-.906l-.644-.574h.842l.282-.74l.331.74h.718l-.564.574l.218.906zm-8.726 4.51l.726-.51l.702.51l-.218-.906l.564-.574h-.718l-.331-.74l-.282.74h-.843l.645.574zm4.726-.51l-.726.51l.245-.906l-.644-.574h.842l.282-.74l.331.74h.718l-.564.574l.218.906zm3.274.51l.726-.51l.702.51l-.218-.906l.564-.574h-.718l-.331-.74l-.282.74h-.842l.644.574zm4.726-4.51l-.726.51l.245-.906l-.644-.574h.842l.282-.74l.331.74h.718l-.564.574l.218.906zm-.726 4.51l.726-.51l.702.51l-.218-.906l.564-.574h-.718l-.331-.74l-.282.74h-.842l.644.574z" clipRule="evenodd"/></g></svg>
            {" "}by{" "}
            <a
              href="https://justinlevine.me"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Justin Levine
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
