import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SiteShell } from "@/components/site-shell"

export const metadata = {
  title: "Page not found",
}

export default function NotFound() {
  return (
    <SiteShell footer={false}>
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Button asChild>
          <Link href="/">Back to homepage</Link>
        </Button>
      </main>
    </SiteShell>
  )
}
