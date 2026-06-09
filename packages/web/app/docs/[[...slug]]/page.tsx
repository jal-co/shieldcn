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
      <div className="mx-auto grid w-full max-w-[90rem] grid-cols-1 gap-10 px-6 py-10 md:px-10 lg:py-14 xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-12 2xl:grid-cols-[minmax(0,52rem)_15rem] 2xl:justify-center">
        <div className="min-w-0">
          <div className="flex w-full max-w-[52rem] flex-col gap-8">
            {/* Title + description */}
            <div className="flex flex-col gap-3 border-b border-border/60 pb-8">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
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
                <p className="max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
                  {page.data.description}
                </p>
              )}
            </div>

            {/* MDX content */}
            <div className="prose prose-zinc max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-headings:text-balance prose-p:text-pretty prose-pre:my-5 prose-table:my-5">
              <MDX components={getMDXComponents()} />
            </div>
          </div>
        </div>

        {/* Table of contents */}
        {toc && toc.length > 0 && (
          <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] shrink-0 overflow-y-auto xl:block">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                On This Page
              </p>
              <div className="flex flex-col gap-1 border-l border-border/50 pl-3">
                {toc.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    className="rounded-sm py-1 text-sm leading-5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 line-clamp-2"
                    style={{
                      paddingLeft: (item.depth - 2) * 10,
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
