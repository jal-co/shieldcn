import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { source } from "@/lib/source"
import { getMDXComponents } from "@/mdx-components"
import { pageMetadata } from "@/lib/metadata"
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
        <div className="flex flex-col gap-12 w-full">
          {/* Title + description */}
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              {page.data.title}
            </h1>
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
  return pageMetadata({
    title: page.data.title,
    description: page.data.description || "shieldcn documentation",
    path: `/docs${slug ? `/${slug}` : ""}`,
  })
}
