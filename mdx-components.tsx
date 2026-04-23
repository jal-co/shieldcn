import type { MDXComponents } from "mdx/types"
import { BadgeSandbox } from "@/components/badge-sandbox"
import { CodeBlock } from "@/components/code-block"
import { CodeLine } from "@/components/code-line"
import { ApiRefTable } from "@/components/api-ref-table"

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...components,

    // Badge sandbox for docs pages
    BadgeSandbox,

    // jalco-ui registry components
    CodeBlock,
    CodeLine,
    ApiRefTable,
  }
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return getMDXComponents(components)
}
