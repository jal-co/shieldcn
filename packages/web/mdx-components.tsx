import type { MDXComponents } from "mdx/types"
import { BadgeSandbox } from "@/components/badge-sandbox"
import { BadgePreview, BadgePreviewGroup, BadgePreviewCard } from "@/components/badge-preview"
import { ChartPreview } from "@/components/chart-preview"
import { ChartSandbox } from "@/components/chart-sandbox"
import { CodeBlock } from "@/components/code-block"
import { CodeLine } from "@/components/code-line"
import { ApiRefTable } from "@/components/api-ref-table"
import { InstallBlock } from "@/components/install-block"
import { InlineHint } from "@/components/shadcncraft/pro-application/inline-hint"

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...components,

    // Badge sandbox for docs pages
    BadgeSandbox,

    // Badge preview components
    BadgePreview,
    BadgePreviewGroup,
    BadgePreviewCard,
    ChartPreview,
    ChartSandbox,
    // Headers and sponsors reuse the generic full-width image preview.
    HeaderPreview: ChartPreview,
    SponsorsPreview: ChartPreview,
    ContributorsPreview: ChartPreview,

    // jalco-ui registry components
    CodeBlock,
    CodeLine,
    ApiRefTable,
    InstallBlock,
    InlineHint,
  }
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return getMDXComponents(components)
}
