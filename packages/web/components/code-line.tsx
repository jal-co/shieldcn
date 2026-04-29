import * as React from "react"
import { cn } from "@/lib/utils"
import { highlightCode } from "@/lib/highlight-code"
import { CodeLineCopyButton } from "@/components/code-line-copy-button"

interface CodeLineProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The code string to display. Should be a single line. */
  code: string
  /** Language for syntax highlighting. */
  language?: string
  /** Optional leading label displayed before the code (e.g. "Import"). */
  label?: string
  /** Hide the copy button. */
  hideCopy?: boolean
  /** Shiki theme name for single-theme rendering (e.g. "dracula", "nord"). */
  theme?: string
}

async function CodeLine({
  code,
  language = "tsx",
  label,
  hideCopy = false,
  theme,
  className,
  ...props
}: CodeLineProps) {
  const highlighted = await highlightCode(code.trim(), language, theme)

  // Extract background color from shiki's inline theme output
  const themeBg = theme
    ? highlighted.match(/background-color:\s*([^;"]+)/)?.[1]
    : undefined

  return (
    <div
      data-slot="code-line"
      className={cn(
        "inline-flex w-full items-center gap-2 overflow-hidden rounded-lg border border-border/60 shadow-xs",
        !theme && "bg-muted/30",
        className
      )}
      style={themeBg ? { backgroundColor: themeBg } : undefined}
      {...props}
    >
      {label && (
        <span className="flex shrink-0 items-center self-stretch border-r border-border/60 bg-muted/50 px-3 text-xs font-medium text-muted-foreground">
          {label}
        </span>
      )}
      <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
        <div
          className={cn(
            "code-block whitespace-nowrap px-3 py-2",
            "[&_pre]:m-0 [&_pre]:inline [&_pre]:bg-transparent [&_pre]:p-0",
            "[&_code]:font-mono [&_code]:text-[13px]"
          )}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
      {!hideCopy && <CodeLineCopyButton value={code.trim()} />}
    </div>
  )
}

export { CodeLine, type CodeLineProps }
