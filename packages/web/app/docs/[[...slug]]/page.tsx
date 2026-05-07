import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { source } from "@/lib/source"
import { getMDXComponents } from "@/mdx-components"

import { techArticleJsonLd } from "@/lib/json-ld"

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>
}) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const MDX = page.data.body
  const toc = page.data.toc

  const slug = params.slug?.join("/") || ""
  const path = `/docs${slug ? `/${slug}` : ""}`

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            techArticleJsonLd({
              title: page.data.title,
              description: page.data.description || "shieldcn documentation",
              path,
            }),
          ),
        }}
      />
      <div className="mx-auto flex w-full items-start gap-14 py-10 px-6 md:px-10">
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-6 w-full">
          {/* Title + description */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                {page.data.title}
              </h1>
              {(() => {
                const badge = (page.data as unknown as Record<string, unknown>).badge
                return typeof badge === "string" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={badge} alt="" className="h-6 shrink-0" />
                ) : null
              })()}
            </div>
            {page.data.description && (
              <p className="text-xl text-muted-foreground leading-relaxed">
                {page.data.description}
              </p>
            )}
          </div>

          {/* MDX content */}
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <MDX components={getMDXComponents()} />
          </div>
        </div>
      </div>

      {/* Table of contents */}
      {toc && toc.length > 0 && (
        <aside className="sticky top-24 hidden w-64 shrink-0 xl:block">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              On This Page
            </p>
            <div className="flex flex-col gap-2 border-l border-border/40 pl-4">
              {toc.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground line-clamp-2"
                  style={{
                    paddingLeft: (item.depth - 2) * 12,
                  }}
                >
                  {item.title}
                </a>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
    </>
  )
}

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const slug = params.slug?.join("/") || ""
  const path = `/docs${slug ? `/${slug}` : ""}`
  const url = `https://shieldcn.dev${path}`
  const ogTitle = `${page.data.title} — shieldcn`
  const description = page.data.description || "shieldcn documentation"
  const badge = (page.data as unknown as Record<string, unknown>).badge as string | undefined

  // Build dynamic OG image URL with page metadata
  const ogParams = new URLSearchParams()
  ogParams.set("title", page.data.title)
  if (description) ogParams.set("description", description)
  if (badge) ogParams.set("badge", badge)
  ogParams.set("path", path)
  const ogImage = `https://shieldcn.dev/api/og/docs?${ogParams.toString()}`

  return {
    title: page.data.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "shieldcn",
      title: ogTitle,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: ogTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogImage],
    },
  }
}
