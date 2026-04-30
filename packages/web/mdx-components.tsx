import type { MDXComponents } from "mdx/types"
import { BadgeSandbox } from "@/components/badge-sandbox"
import { BadgePreview, BadgePreviewGroup, BadgePreviewCard } from "@/components/badge-preview"
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
