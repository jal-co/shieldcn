/**
 * shieldcn
 * components/svg-icon-upload
 *
 * Client-side SVG upload component for custom badge icons.
 * Reads an SVG file, validates it, and converts it to a base64 data URI
 * that can be passed as the `logo` query parameter.
 *
 * No server storage — everything stays in the URL.
 */

"use client"

import { useCallback, useRef, useState } from "react"
import { FileUp, Trash2, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** Max SVG file size (32KB should be plenty for icons) */
const MAX_SIZE = 32 * 1024

interface SvgIconUploadProps {
  /** Current logo value (could be a slug, data URI, or empty) */
  value: string
  /** Called with the new logo value */
  onChange: (value: string) => void
  /** Optional class name */
  className?: string
}

/**
 * Minify SVG content for smaller data URIs.
 * Strips XML declarations, comments, editor metadata, unnecessary
 * attributes, and collapses whitespace. Keeps all path data intact.
 */
function minifySvg(svg: string): string {
  let s = svg
  // Strip XML declaration
  s = s.replace(/<\?xml[^?]*\?>\s*/g, "")
  // Strip DOCTYPE
  s = s.replace(/<!DOCTYPE[^>]*>\s*/gi, "")
  // Strip comments
  s = s.replace(/<!--[\s\S]*?-->\s*/g, "")
  // Strip <metadata>...</metadata>
  s = s.replace(/<metadata[\s\S]*?<\/metadata>\s*/gi, "")
  // Strip <defs> if empty
  s = s.replace(/<defs\s*\/>|<defs>\s*<\/defs>/gi, "")
  // Remove unnecessary attributes from root <svg>
  s = s.replace(/(<svg[^>]*?)\s+id="[^"]*"/gi, "$1")
  s = s.replace(/(<svg[^>]*?)\s+version="[^"]*"/gi, "$1")
  s = s.replace(/(<svg[^>]*?)\s+xml:space="[^"]*"/gi, "$1")
  s = s.replace(/(<svg[^>]*?)\s+enable-background="[^"]*"/gi, "$1")
  s = s.replace(/(<svg[^>]*?)\s+x="0[^"]*"/gi, "$1")
  s = s.replace(/(<svg[^>]*?)\s+y="0[^"]*"/gi, "$1")
  // Remove id attributes from inner elements
  s = s.replace(/(<(?!svg)[^>]*?)\s+id="[^"]*"/gi, "$1")
  // Remove data-name attributes
  s = s.replace(/\s+data-name="[^"]*"/gi, "")
  // Remove class attributes
  s = s.replace(/\s+class="[^"]*"/gi, "")
  // Collapse whitespace between tags
  s = s.replace(/>\s+</g, "><")
  // Unwrap bare <g> wrappers (no attributes)
  s = s.replace(/<g>([\s\S]*?)<\/g>/g, "$1")
  return s.trim()
}

/**
 * Convert raw SVG string to a minified base64 data URI.
 */
function svgToDataUri(svg: string): string {
  const minified = minifySvg(svg)
  const b64 = btoa(unescape(encodeURIComponent(minified)))
  return `data:image/svg+xml;base64,${b64}`
}

/**
 * Extract a preview-friendly name from SVG content.
 */
function extractSvgName(svg: string): string {
  // Try <title>
  const titleMatch = svg.match(/<title>([^<]+)<\/title>/)
  if (titleMatch) return titleMatch[1].slice(0, 24)

  // Try aria-label
  const ariaMatch = svg.match(/aria-label="([^"]+)"/)
  if (ariaMatch) return ariaMatch[1].slice(0, 24)

  return "custom icon"
}

/**
 * Validate that the string is a plausible SVG.
 */
function isValidSvg(content: string): boolean {
  const trimmed = content.trim()
  return trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")
}

export function SvgIconUpload({ value, onChange, className }: SvgIconUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const isDataUri = value.startsWith("data:image/svg+xml")

  // Show encoded size for context
  const encodedSize = isDataUri ? value.length : 0

  const handleFile = useCallback(
    (file: File) => {
      setError(null)

      if (!file.type.includes("svg") && !file.name.endsWith(".svg")) {
        setError("Only SVG files are supported")
        return
      }

      if (file.size > MAX_SIZE) {
        setError(`File too large (${Math.round(file.size / 1024)}KB). Max 32KB.`)
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const content = reader.result as string
        if (!isValidSvg(content)) {
          setError("Invalid SVG content")
          return
        }

        const dataUri = svgToDataUri(content)
        setPreviewName(extractSvgName(content))
        onChange(dataUri)
        setOpen(false)
      }
      reader.onerror = () => setError("Failed to read file")
      reader.readAsText(file)
    },
    [onChange],
  )

  const handlePaste = useCallback(
    (text: string) => {
      setError(null)
      const trimmed = text.trim()

      // Already a data URI
      if (trimmed.startsWith("data:image/svg+xml")) {
        onChange(trimmed)
        setPreviewName("pasted icon")
        setOpen(false)
        return
      }

      // Raw SVG
      if (isValidSvg(trimmed)) {
        const dataUri = svgToDataUri(trimmed)
        setPreviewName(extractSvgName(trimmed))
        onChange(dataUri)
        setOpen(false)
        return
      }

      setError("Not a valid SVG or data URI")
    },
    [onChange],
  )

  const handleClear = useCallback(() => {
    onChange("")
    setPreviewName(null)
    setError(null)
  }, [onChange])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-1.5 text-xs",
            isDataUri && "border-border text-foreground",
            className,
          )}
        >
          {isDataUri ? (
            <>
              <Image className="size-3.5" />
              {previewName || "custom icon"}
            </>
          ) : (
            <>
              <FileUp className="size-3.5" />
              Upload SVG
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="start">
        <p className="text-sm font-medium">Custom SVG icon</p>
        <p className="text-xs text-muted-foreground">
          Upload an SVG file or paste SVG markup. The icon is encoded directly
          in the badge URL — nothing is stored on the server.
        </p>

        {/* Drop zone */}
        <div
          className={cn(
            "flex flex-col items-center gap-2 rounded-md border border-dashed p-4 transition-colors",
            dragOver && "border-foreground/40 bg-muted",
          )}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files?.[0]
            if (file) handleFile(file)
          }}
        >
          <FileUp className="size-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Drop SVG here or{" "}
            <button
              type="button"
              className="text-primary underline underline-offset-2"
              onClick={() => inputRef.current?.click()}
            >
              browse
            </button>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ""
            }}
          />
        </div>

        {/* Paste input */}
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Or paste SVG / data URI
          </p>
          <Input
            placeholder='<svg viewBox="0 0 24 24">...</svg>'
            className="h-7 text-xs font-mono"
            onPaste={(e) => {
              const text = e.clipboardData.getData("text")
              if (text) {
                e.preventDefault()
                handlePaste(text)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = (e.target as HTMLInputElement).value
                if (val) handlePaste(val)
              }
            }}
          />
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {isDataUri && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Encoded in URL</span>
              <span className="font-mono">
                {encodedSize < 1024
                  ? `${encodedSize} chars`
                  : `${(encodedSize / 1024).toFixed(1)}KB`}
              </span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleClear}
            >
              <Trash2 className="size-3.5" />
              Remove custom icon
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
