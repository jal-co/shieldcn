"use client"

import { useState, useCallback, useId, useMemo, useSyncExternalStore } from "react"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// "stars" is retired: GitHub restricted the stargazers API to repo
// admins/collaborators (June 2026), so star-history data can no longer be
// fetched. Star chart URLs now render a 100x1 transparent image.
type ChartKind = "stars" | "issues" | "commits" | "npm" | "json"
type ActiveChartKind = Exclude<ChartKind, "stars">

interface ChartSandboxProps {
  /** Initial chart kind. */
  kind?: ChartKind
  /** Default path/data values keyed by field name. */
  defaults?: Record<string, string>
}

const THEMES = ["_none", "zinc", "blue", "green", "rose", "orange", "amber", "violet", "purple", "cyan", "emerald"]
const FONTS = ["inter", "geist", "geist-mono", "jetbrains-mono", "fira-code", "roboto", "space-grotesk"]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChartSandbox({ kind: initialKind = "npm", defaults = {} }: ChartSandboxProps) {
  const id = useId()

  // Coerce the retired "stars" kind (still referenced from older docs) to npm.
  const [kind, setKind] = useState<ActiveChartKind>(
    initialKind === "stars" ? "npm" : initialKind,
  )

  // Data inputs (interpretation depends on kind).
  const [owner, setOwner] = useState(defaults.owner ?? "vercel")
  const [repo, setRepo] = useState(defaults.repo ?? "next.js")
  const [user, setUser] = useState(defaults.user ?? "torvalds")
  const [aligned, setAligned] = useState(false)
  const [pkg, setPkg] = useState(defaults.package ?? "zod")
  const [values, setValues] = useState(defaults.values ?? "10,25,40,30,60,55,80")
  const [dataLabel, setDataLabel] = useState(defaults.label ?? "")

  // Styling.
  const [imageFormat, setImageFormat] = useState<"svg" | "png">("svg")
  const [mode, setMode] = useState("dark")
  const [theme, setTheme] = useState("_none")
  const [font, setFont] = useState("inter")
  const [color, setColor] = useState("")
  const [fill, setFill] = useState("")
  const [area, setArea] = useState(true)
  const [transparent, setTransparent] = useState(false)
  const [border, setBorder] = useState(true)
  const [logo, setLogo] = useState(true)
  const [width, setWidth] = useState("800")
  const [height, setHeight] = useState("400")
  const [title, setTitle] = useState("")
  const [icon, setIcon] = useState("")
  const [days, setDays] = useState("365")

  // Axis controls.
  const [yScale, setYScale] = useState("linear")
  const [yMin, setYMin] = useState("")
  const [yMax, setYMax] = useState("")
  const [yTicks, setYTicks] = useState("")
  const [xTicks, setXTicks] = useState("")

  // Output.
  const [format, setFormat] = useState("markdown")
  const [copied, setCopied] = useState(false)

  const baseUrl = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://shieldcn.dev",
  )

  const handleFormatChange = useCallback((next: string) => {
    setFormat(next)
    setCopied(false)
  }, [])

  const endpoint = useMemo(() => {
    switch (kind) {
      case "issues": return "/chart/github/issues/:owner/:repo.svg"
      case "commits": return "/chart/github/commits/:user.svg"
      case "npm": return "/chart/npm/:package.svg"
      case "json": return "/chart/json.svg?values=…"
    }
  }, [kind])

  const builtUrl = useMemo(() => {
    const ext = imageFormat === "svg" ? ".svg" : ".png"
    let path: string
    if (kind === "issues") {
      if (!owner || !repo) return null
      path = `/chart/github/${kind}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${ext}`
    } else if (kind === "commits") {
      const users = user.split(",").map(u => u.trim()).filter(Boolean)
      if (users.length === 0) return null
      path = `/chart/github/commits/${users.map(encodeURIComponent).join(",")}${ext}`
    } else if (kind === "npm") {
      if (!pkg) return null
      // Scoped packages keep their slash.
      const encoded = pkg.split("/").map(encodeURIComponent).join("/")
      path = `/chart/npm/${encoded}${ext}`
    } else {
      path = `/chart/json${ext}`
    }

    const qp = new URLSearchParams()
    if (kind === "json") {
      const cleaned = values.split(",").map(s => s.trim()).filter(Boolean).join(",")
      if (!cleaned) return null
      qp.set("values", cleaned)
      if (dataLabel) qp.set("label", dataLabel)
    }
    if (kind === "commits" && aligned) qp.set("align", "true")
    if (kind === "npm" && days && days !== "365") qp.set("days", days)
    if (mode !== "dark") qp.set("mode", mode)
    if (theme && theme !== "_none") qp.set("theme", theme)
    if (font && font !== "inter") qp.set("font", font)
    if (color) qp.set("color", color)
    if (fill) qp.set("fill", fill)
    if (!area) qp.set("area", "false")
    if (transparent) qp.set("bg", "transparent")
    if (!border) qp.set("border", "false")
    if (!logo) qp.set("logo", "false")
    if (width && width !== "800") qp.set("width", width)
    if (height && height !== "400") qp.set("height", height)
    if (title) qp.set("title", title)
    if (icon) qp.set("icon", icon)
    if (yScale === "log") qp.set("yScale", "log")
    if (yMin) qp.set("yMin", yMin)
    if (yMax) qp.set("yMax", yMax)
    if (yTicks) qp.set("yTicks", yTicks)
    if (xTicks) qp.set("xTicks", xTicks)

    const qs = qp.toString()
    return `${baseUrl}${path}${qs ? `?${qs}` : ""}`
  }, [kind, imageFormat, owner, repo, user, aligned, pkg, values, dataLabel, days, mode, theme, font, color, fill, area, transparent, border, logo, width, height, title, icon, yScale, yMin, yMax, yTicks, xTicks, baseUrl])

  const formattedOutput = useMemo(() => {
    if (!builtUrl) return ""
    switch (format) {
      case "markdown": return `![chart](${builtUrl})`
      case "html": return `<img alt="chart" src="${builtUrl}">`
      default: return builtUrl
    }
  }, [builtUrl, format])

  const handleCopy = useCallback(() => {
    if (!formattedOutput) return
    navigator.clipboard.writeText(formattedOutput).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => toast.error("Couldn't copy to clipboard"),
    )
  }, [formattedOutput])

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden not-prose">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 font-mono text-sm">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 rounded-md font-semibold">
            GET
          </Badge>
          <span className="text-muted-foreground break-all">{endpoint}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Kind + data inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SField label="chart">
            <Select value={kind} onValueChange={v => setKind(v as ActiveChartKind)}>
              <SelectTrigger aria-label="Chart kind" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stars" disabled>GitHub stars (retired by GitHub)</SelectItem>
                <SelectItem value="issues">GitHub issues</SelectItem>
                <SelectItem value="commits">GitHub commits</SelectItem>
                <SelectItem value="npm">npm downloads</SelectItem>
                <SelectItem value="json">Inline JSON</SelectItem>
              </SelectContent>
            </Select>
          </SField>

          {kind === "issues" && (
            <>
              <SField label="owner">
                <Input id={`${id}-owner`} value={owner} onChange={e => setOwner(e.target.value)} placeholder="vercel" />
              </SField>
              <SField label="repo">
                <Input id={`${id}-repo`} value={repo} onChange={e => setRepo(e.target.value)} placeholder="next.js" />
              </SField>
            </>
          )}

          {kind === "commits" && (
            <>
              <SField label="user">
                <Input id={`${id}-user`} value={user} onChange={e => setUser(e.target.value)} placeholder="torvalds or torvalds,gaearon" />
              </SField>
              <SField label="aligned">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer pt-2.5">
                  <Checkbox aria-label="Align users at account birth" checked={aligned} onCheckedChange={v => setAligned(v === true)} />
                  <span className="font-mono text-muted-foreground">line up at month zero</span>
                </label>
              </SField>
            </>
          )}

          {kind === "npm" && (
            <>
              <SField label="package">
                <Input id={`${id}-pkg`} value={pkg} onChange={e => setPkg(e.target.value)} placeholder="react or @scope/name" />
              </SField>
              <SField label="days">
                <Input id={`${id}-days`} value={days} onChange={e => setDays(e.target.value)} placeholder="365" />
              </SField>
            </>
          )}

          {kind === "json" && (
            <>
              <SField label="values">
                <Input id={`${id}-values`} value={values} onChange={e => setValues(e.target.value)} placeholder="10,25,40,30" />
              </SField>
              <SField label="label">
                <Input id={`${id}-data-label`} value={dataLabel} onChange={e => setDataLabel(e.target.value)} placeholder="value" />
              </SField>
            </>
          )}
        </div>

        <Separator />

        {/* Styling */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SField label="format">
            <Select value={imageFormat} onValueChange={v => setImageFormat(v as "svg" | "png")}>
              <SelectTrigger aria-label="Image format" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="svg">SVG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
              </SelectContent>
            </Select>
          </SField>
          <SField label="mode">
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger aria-label="Color mode" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">dark</SelectItem>
                <SelectItem value="light">light</SelectItem>
              </SelectContent>
            </Select>
          </SField>
          <SField label="theme">
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger aria-label="Theme" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {THEMES.map(t => <SelectItem key={t} value={t}>{t === "_none" ? "none" : t}</SelectItem>)}
              </SelectContent>
            </Select>
          </SField>
          <SField label="font">
            <Select value={font} onValueChange={setFont}>
              <SelectTrigger aria-label="Font" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </SField>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SField label="color"><ColorInput inputId={`${id}-color`} inputName="color" ariaLabel="Line color hex" value={color} onChange={setColor} placeholder="auto" /></SField>
          <SField label="fill"><ColorInput inputId={`${id}-fill`} inputName="fill" ariaLabel="Fill color hex" value={fill} onChange={setFill} placeholder="auto" /></SField>
          <SField label="width"><Input id={`${id}-w`} value={width} onChange={e => setWidth(e.target.value)} placeholder="800" /></SField>
          <SField label="height"><Input id={`${id}-h`} value={height} onChange={e => setHeight(e.target.value)} placeholder="400" /></SField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SField label="icon"><LogoPicker value={icon} onChange={setIcon} ariaLabel="Chart icon" /></SField>
          <SField label="title"><Input id={`${id}-title`} value={title} onChange={e => setTitle(e.target.value)} placeholder="auto" /></SField>
          <SField label="flags">
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1.5">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox aria-label="Area fill" checked={area} onCheckedChange={v => setArea(v === true)} />
                <span className="font-mono text-muted-foreground">area</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox aria-label="Border" checked={border} onCheckedChange={v => setBorder(v === true)} />
                <span className="font-mono text-muted-foreground">border</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox aria-label="Transparent background" checked={transparent} onCheckedChange={v => setTransparent(v === true)} />
                <span className="font-mono text-muted-foreground">transparent</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox aria-label="Show watermark" checked={logo} onCheckedChange={v => setLogo(v === true)} />
                <span className="font-mono text-muted-foreground">logo</span>
              </label>
            </div>
          </SField>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SField label="yScale">
            <Select value={yScale} onValueChange={setYScale}>
              <SelectTrigger aria-label="Y axis scale" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">linear</SelectItem>
                <SelectItem value="log">log</SelectItem>
              </SelectContent>
            </Select>
          </SField>
          <SField label="yMin"><Input id={`${id}-ymin`} value={yMin} onChange={e => setYMin(e.target.value)} placeholder="auto" /></SField>
          <SField label="yMax"><Input id={`${id}-ymax`} value={yMax} onChange={e => setYMax(e.target.value)} placeholder="auto" /></SField>
          <SField label="yTicks"><Input id={`${id}-yticks`} value={yTicks} onChange={e => setYTicks(e.target.value)} placeholder="4" /></SField>
          <SField label="xTicks"><Input id={`${id}-xticks`} value={xTicks} onChange={e => setXTicks(e.target.value)} placeholder="3" /></SField>
        </div>

        <Separator />

        {/* Output */}
        <Tabs value={format} onValueChange={handleFormatChange}>
          <TabsList>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
            <TabsTrigger value="html">HTML</TabsTrigger>
          </TabsList>
          {["url", "markdown", "html"].map(key => (
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

        {/* Live preview */}
        {builtUrl && (
          <div className="overflow-hidden rounded-md border border-border bg-muted/30 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={builtUrl} alt="chart preview" className="w-full rounded" />
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
