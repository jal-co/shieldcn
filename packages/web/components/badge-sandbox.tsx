"use client"

import { useState, useCallback, useId, useMemo, useSyncExternalStore } from "react"
import { Copy, Check, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ColorInput } from "@/components/color-input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { LogoPicker } from "@/components/logo-picker"
import { SvgIconUpload } from "@/components/svg-icon-upload"
import { allowedVariantsForPath, VARIANT_LABELS } from "@shieldcn/core/badges/registry"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PathParam {
  name: string
  label: string
  placeholder: string
  required?: boolean
  description?: string
}

/** Extra endpoint-specific query params (e.g. workflow, branch for CI) */
interface ExtraParam {
  name: string
  label: string
  placeholder: string
  description?: string
}

interface BadgeSandboxProps {
  /** HTTP method label */
  method?: string
  /** URL path pattern (e.g. "/npm/:packageName.svg") */
  endpoint: string
  /** Path parameters that fill :param slots */
  pathParams: PathParam[]
  /** Extra endpoint-specific query params (not the standard styling ones) */
  extraParams?: ExtraParam[]
  /** Default values for path/extra params */
  defaults?: Record<string, string>
  /** Show statusDot checkbox (for CI-type badges) */
  showStatusDot?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BadgeSandbox({
  method = "GET",
  endpoint,
  pathParams,
  extraParams = [],
  defaults = {},
  showStatusDot = false,
}: BadgeSandboxProps) {
  const sandboxId = useId()

  // Path + extra param values
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const p of [...pathParams, ...extraParams]) {
      init[p.name] = defaults[p.name] ?? ""
    }
    return init
  })

  // Standard styling params (same for every badge)
  const [imageFormat, setImageFormat] = useState<"png" | "svg">("svg")
  const [variant, setVariant] = useState("default")
  const [size, setSize] = useState("sm")
  const [mode, setMode] = useState("dark")
  const [theme, setTheme] = useState("_none")
  const [logo, setLogo] = useState("")
  const [logoColor, setLogoColor] = useState("")
  const [split, setSplit] = useState(false)
  const [statusDot, setStatusDot] = useState(true)
  const [label, setLabel] = useState("")

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [color, setColor] = useState("")
  const [gradient, setGradient] = useState("")
  const [valueColor, setValueColor] = useState("")
  const [labelTextColor, setLabelTextColor] = useState("")
  const [labelOpacity, setLabelOpacity] = useState("")

  // Output
  const [format, setFormat] = useState("markdown")
  const [copied, setCopied] = useState(false)
  const [executed, setExecuted] = useState(true) // auto-execute on load

  // Hydration-safe origin: server renders the canonical host, client swaps in
  // the real origin after hydration without a setState-in-effect.
  const baseUrl = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://shieldcn.dev",
  )

  // Changing the output format clears the "copied" state — handled in the tab
  // change handler (below) rather than an effect.
  const handleFormatChange = useCallback((next: string) => {
    setFormat(next)
    setCopied(false)
  }, [])

  // Variants the THIS badge actually supports, from the core registry (source
  // of truth). `:param` placeholders aren't topic keys, so they're ignored;
  // the literal topic segment (e.g. "ci") drives the policy. Keeps the dropdown
  // honest — no missing `branded`, no `branded` on pass/fail state badges.
  const availableVariants = useMemo(() => allowedVariantsForPath(endpoint), [endpoint])

  const setValue = useCallback((name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }, [])

  // Build URL
  const builtUrl = useMemo(() => {
    // Replace .svg extension with selected format
    let path = endpoint.replace(/\.svg$/, imageFormat === "svg" ? ".svg" : ".png")
    for (const p of pathParams) {
      const val = values[p.name]
      if (!val) return null
      path = path.replace(`:${p.name}`, encodeURIComponent(val))
    }
    const qp = new URLSearchParams()
    // Extra params
    for (const p of extraParams) {
      const val = values[p.name]
      if (val) qp.set(p.name, val)
    }
    // Standard params
    if (variant !== "default") qp.set("variant", variant)
    if (size !== "sm") qp.set("size", size)
    if (mode !== "dark") qp.set("mode", mode)
    if (theme && theme !== "_none") qp.set("theme", theme)
    if (logo) qp.set("logo", logo)
    if (logoColor) qp.set("logoColor", logoColor)
    if (split) qp.set("split", "true")
    if (showStatusDot && !statusDot) qp.set("statusDot", "false")
    if (label) qp.set("label", label)
    if (color) qp.set("color", color)
    if (gradient) qp.set("gradient", gradient)
    if (valueColor) qp.set("valueColor", valueColor)
    if (labelTextColor) qp.set("labelTextColor", labelTextColor)
    if (labelOpacity) qp.set("labelOpacity", labelOpacity)

    const qs = qp.toString()
    return `${baseUrl}${path}${qs ? `?${qs}` : ""}`
  }, [endpoint, pathParams, extraParams, values, imageFormat, variant, size, mode, theme, logo, logoColor, split, statusDot, showStatusDot, label, color, gradient, valueColor, labelTextColor, labelOpacity, baseUrl])

  const formattedOutput = useMemo(() => {
    if (!builtUrl) return ""
    switch (format) {
      case "markdown": return `![badge](${builtUrl})`
      case "rst": return `.. image:: ${builtUrl}\n   :alt: badge`
      case "asciidoc": return `image:${builtUrl}[badge]`
      case "html": return `<img alt="badge" src="${builtUrl}">`
      default: return builtUrl
    }
  }, [builtUrl, format])

  const handleCopy = useCallback(() => {
    if (!formattedOutput) return
    navigator.clipboard.writeText(formattedOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [formattedOutput])

  const sizeHeight = { xs: "h-6", sm: "h-8", default: "h-9", lg: "h-10" }[size] || "h-8"

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden not-prose">
      {/* Header */}
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 font-mono text-sm">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 rounded-md font-semibold">
            {method}
          </Badge>
          <span className="text-muted-foreground">{endpoint}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Path params */}
        {pathParams.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Path Parameters
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pathParams.map(p => (
                <div key={p.name} className="space-y-1">
                  {(() => {
                    const inputId = `${sandboxId}-${p.name}`
                    return (
                      <>
                  <div className="flex items-baseline gap-1.5">
                    <Label htmlFor={inputId} className="font-mono text-xs">{p.name}</Label>
                    {p.required && <Badge variant="secondary" className="text-[9px] px-1 py-0">required</Badge>}
                  </div>
                  <Input
                    id={inputId}
                    name={p.name}
                    value={values[p.name] ?? ""}
                    onChange={e => setValue(p.name, e.target.value)}
                    placeholder={p.placeholder}
                  />
                      </>
                    )
                  })()}
                  {p.description && <p className="text-[11px] text-muted-foreground">{p.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extra endpoint-specific params */}
        {extraParams.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {extraParams.map(p => (
              <div key={p.name} className="space-y-1">
                <Label htmlFor={`${sandboxId}-${p.name}`} className="font-mono text-xs">{p.name}</Label>
                <Input
                  id={`${sandboxId}-${p.name}`}
                  name={p.name}
                  value={values[p.name] ?? ""}
                  onChange={e => setValue(p.name, e.target.value)}
                  placeholder={p.placeholder}
                />
                {p.description && <p className="text-[11px] text-muted-foreground">{p.description}</p>}
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Standard styling params */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SField label="format">
            <Select value={imageFormat} onValueChange={v => setImageFormat(v as "png" | "svg")}>
              <SelectTrigger aria-label="Badge image format" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="svg">SVG</SelectItem>
              </SelectContent>
            </Select>
          </SField>

          <SField label="variant">
            <Select value={variant} onValueChange={setVariant}>
              <SelectTrigger aria-label="Badge variant" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableVariants.map(v =>
                  <SelectItem key={v} value={v}>{VARIANT_LABELS[v] ?? v}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </SField>

          <SField label="size">
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger aria-label="Badge size" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[["xs","xs (24px)"],["sm","sm (32px)"],["default","default (36px)"],["lg","lg (40px)"]].map(([v,l]) =>
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </SField>

          <SField label="theme">
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger aria-label="Badge theme" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[["_none","none"],["zinc","zinc"],["blue","blue"],["green","green"],["rose","rose"],["orange","orange"],["violet","violet"]].map(([v,l]) =>
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </SField>

          <SField label="mode">
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger aria-label="Badge color mode" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">dark</SelectItem>
                <SelectItem value="light">light</SelectItem>
              </SelectContent>
            </Select>
          </SField>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SField label="logo">
            <div className="space-y-1.5">
              <LogoPicker value={logo.startsWith("data:") ? "" : logo} onChange={setLogo} />
              <SvgIconUpload value={logo} onChange={setLogo} className="w-full" />
            </div>
          </SField>

          <SField label="logoColor">
            <ColorInput inputId={`${sandboxId}-logo-color`} inputName="logoColor" ariaLabel="Logo color hex" value={logoColor} onChange={setLogoColor} placeholder="auto" />
          </SField>

          <SField label="label">
            <Input id={`${sandboxId}-label`} name="label" aria-label="Custom badge label" value={label} onChange={e => setLabel(e.target.value)} placeholder="auto" />
          </SField>

          <SField label="flags">
            <div className="flex flex-col gap-1 pt-1">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox aria-label="Use split badge layout" checked={split} onCheckedChange={v => setSplit(v === true)} />
                <span className="font-mono text-muted-foreground">split</span>
              </label>
              {showStatusDot && (
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox aria-label="Show status dot" checked={statusDot} onCheckedChange={v => setStatusDot(v === true)} />
                  <span className="font-mono text-muted-foreground">statusDot</span>
                </label>
              )}
            </div>
          </SField>
        </div>

        {/* Advanced */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4"
        >
          <span>{showAdvanced ? "−" : "+"}</span>
          {showAdvanced ? "Hide" : "Show"} color overrides
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SField label="color"><ColorInput inputId={`${sandboxId}-color`} inputName="color" ariaLabel="Badge color hex" value={color} onChange={setColor} placeholder="hex" /></SField>
            <SField label="gradient">
              <Input id={`${sandboxId}-gradient`} name="gradient" aria-label="Badge gradient colors" value={gradient} onChange={e => setGradient(e.target.value)} placeholder="ff6b6b,4ecdc4" />
            </SField>
            <SField label="valueColor"><ColorInput inputId={`${sandboxId}-value-color`} inputName="valueColor" ariaLabel="Value color hex" value={valueColor} onChange={setValueColor} placeholder="hex" /></SField>
            <SField label="labelTextColor"><ColorInput inputId={`${sandboxId}-label-text-color`} inputName="labelTextColor" ariaLabel="Label text color hex" value={labelTextColor} onChange={setLabelTextColor} placeholder="hex" /></SField>
            <SField label="labelOpacity"><Input id={`${sandboxId}-label-opacity`} name="labelOpacity" aria-label="Label opacity" value={labelOpacity} onChange={e => setLabelOpacity(e.target.value)} placeholder="0–1" /></SField>
          </div>
        )}

        <Separator />

        {/* Output format tabs + preview */}
        <Tabs value={format} onValueChange={handleFormatChange}>
          <TabsList>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="rst">rSt</TabsTrigger>
            <TabsTrigger value="asciidoc">AsciiDoc</TabsTrigger>
          </TabsList>

          {["url", "markdown", "html", "rst", "asciidoc"].map(key => (
            <TabsContent key={key} value={key}>
              {formattedOutput && (
                <div className="group relative mt-2">
                  <pre className="overflow-x-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
                    {formattedOutput}
                  </pre>
                  <Button
                    aria-label={copied ? "Copied output" : "Copy output"}
                    variant="outline" size="icon-xs"
                    onClick={handleCopy}
                    className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Execute + preview */}
        <Button onClick={() => setExecuted(true)} disabled={!builtUrl} variant="outline" className="w-full">
          <Play className="size-3.5" /> Execute
        </Button>

        {executed && builtUrl && (
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={builtUrl} alt="badge preview" className={sizeHeight} />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="font-mono text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
