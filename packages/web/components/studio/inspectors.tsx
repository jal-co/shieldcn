/**
 * shieldcn
 * components/studio/inspectors
 *
 * Property-editor panels for the README Studio inspector. One panel per block
 * type (markdown, header, badges, chart). Each panel reads a block and emits an
 * updated block via onChange. All controls use shadcn primitives + the project's
 * shared pickers (LogoPicker, ColorInput).
 */

"use client"

import { Fragment, useCallback, useMemo, useRef, useState } from "react"
import { Plus, Trash2, GripVertical, Bold, Italic, Link2, Heading, List, Table, Shuffle, AlignLeft, AlignCenter, AlignRight } from "lucide-react"
import { IconAlignmentLeft } from "@central-icons-react/round-filled-radius-1-stroke-1.5/IconAlignmentLeft"
import { IconAlignmentCenter } from "@central-icons-react/round-filled-radius-1-stroke-1.5/IconAlignmentCenter"
import { IconAlignmentRight } from "@central-icons-react/round-filled-radius-1-stroke-1.5/IconAlignmentRight"
import { LogoPicker } from "@/components/logo-picker"
import { SvgIconUpload } from "@/components/svg-icon-upload"
import { ColorInput } from "@/components/color-input"
import { SearchablePicker, type SearchablePickerSection } from "@/components/searchable-picker"
import { SaveBadgeButton } from "@/components/save-badge-button"
import { InsertSavedBadge } from "@/components/studio/insert-saved-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  BADGE_PRESETS,
  resolveTemplate,
  resolveDefaultLinkUrl,
  VARIANTS,
  VARIANT_LABELS,
  allowedVariantsForPath,
  SIZES,
  FONTS,
  THEMES,
  type BuilderState,
} from "@/lib/badge-builder-shared"
import {
  HEADER_PRESETS,
  HEADER_PRESET_LABELS,
  HEADER_SIZES,
  HEADER_SIZE_LABELS,
  HEADER_FONTS,
  HEADER_THEMES,
  randomUnsplashHeader,
  type HeaderState,
} from "@/lib/header-builder-shared"
import {
  SPONSORS_PRESETS,
  SPONSORS_PRESET_LABELS,
  SPONSORS_SIZES,
  SPONSORS_SIZE_LABELS,
  SPONSORS_FONTS,
  SPONSORS_THEMES,
  type SponsorsState,
} from "@/lib/sponsors-builder-shared"
import {
  CONTRIBUTORS_PRESETS,
  CONTRIBUTORS_PRESET_LABELS,
  CONTRIBUTORS_SIZES,
  CONTRIBUTORS_SIZE_LABELS,
  CONTRIBUTORS_FONTS,
  CONTRIBUTORS_THEMES,
  type ContributorsState,
} from "@/lib/contributors-builder-shared"
import {
  PRESET_GROUPS,
  PRESET_GROUP_NAMES,
  PRESET_FILTERS,
  getPresetService,
  getPresetDisplayLabel,
  presetMatchesSearch,
  findMatchingPreset,
} from "@/lib/badge-preset-match"
import {
  CHART_THEMES,
  CHART_FONTS,
  makeBadgeItem,
  type Alignment,
  type BadgeItem,
  type BadgesBlock,
  type GroupBlock,
  type ChartBlock,
  randomPlaceholder,
  PLACEHOLDER_IMAGE,
  type ChartState,
  type HeaderBlock,
  type ImageBlock,
  type MarkdownBlock,
  type SponsorsBlock,
  type ContributorsBlock,
  type TableBlock,
} from "@/lib/studio-shared"

// ---------------------------------------------------------------------------
// Small layout helpers
// ---------------------------------------------------------------------------

function Field({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}

function ToggleField({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

/** Wrap an interactive element with an accessible tooltip. */
export function Tip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ToolBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tip label={title}>
      <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" aria-label={title} onClick={onClick}>
        {children}
      </Button>
    </Tip>
  )
}

function AlignControl({ value, onChange }: { value: Alignment; onChange: (v: Alignment) => void }) {
  return (
    <Field label="Alignment">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={v => v && onChange(v as Alignment)}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <ToggleGroupItem value="left" aria-label="Align left" className="flex-1"><IconAlignmentLeft size={15} /></ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Align center" className="flex-1"><IconAlignmentCenter size={15} /></ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Align right" className="flex-1"><IconAlignmentRight size={15} /></ToggleGroupItem>
      </ToggleGroup>
    </Field>
  )
}

/** Reverse-match a badge path, excluding the dash-format static Custom preset
 *  (the Studio handles those through a separate control). */
const findPresetForPath = (path: string) => findMatchingPreset(path, { skipStatic: true })

// ---------------------------------------------------------------------------
// Markdown inspector
// ---------------------------------------------------------------------------

export function MarkdownInspector({ block, onChange }: { block: MarkdownBlock; onChange: (b: MarkdownBlock) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Wrap the current selection (or insert at caret) with before/after tokens.
  const surround = useCallback((before: string, after = before, placeholder = "text") => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const value = block.content
    const selected = value.slice(start, end) || placeholder
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange({ ...block, content: next })
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = start + before.length
      el.selectionEnd = start + before.length + selected.length
    })
  }, [block, onChange])

  // Prefix the start of the current line(s) with a token (headings, lists).
  const prefixLine = useCallback((token: string) => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const value = block.content
    const lineStart = value.lastIndexOf("\n", start - 1) + 1
    const next = value.slice(0, lineStart) + token + value.slice(lineStart)
    onChange({ ...block, content: next })
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = start + token.length
    })
  }, [block, onChange])

  // Insert a standalone block snippet at the caret, padded with blank lines so
  // GitHub-flavored Markdown (tables, etc.) parses correctly.
  const insertSnippet = useCallback((snippet: string) => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const value = block.content
    const before = value.slice(0, start)
    const after = value.slice(start)
    const lead = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : ""
    const trail = after && !after.startsWith("\n") ? "\n\n" : ""
    const insertion = lead + snippet + trail
    const next = before + insertion + after
    onChange({ ...block, content: next })
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + insertion.length
      el.selectionStart = el.selectionEnd = pos
    })
  }, [block, onChange])

  const insertTable = useCallback(() => {
    insertSnippet("| Column | Column |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |")
  }, [insertSnippet])

  const insertLink = useCallback(() => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = block.content.slice(start, end) || "link text"
    const snippet = `[${selected}](https://)`
    const next = block.content.slice(0, start) + snippet + block.content.slice(end)
    onChange({ ...block, content: next })
    requestAnimationFrame(() => {
      el.focus()
      // Select the URL placeholder so the user can type it immediately.
      const urlStart = start + selected.length + 3
      el.selectionStart = urlStart
      el.selectionEnd = urlStart + 8
    })
  }, [block, onChange])

  return (
    <div className="space-y-4">
      <Field label="Markdown" htmlFor="md-content">
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-1">
          <ToolBtn title="Bold" onClick={() => surround("**")}><Bold className="size-3.5" /></ToolBtn>
          <ToolBtn title="Italic" onClick={() => surround("_")}><Italic className="size-3.5" /></ToolBtn>
          <ToolBtn title="Link" onClick={insertLink}><Link2 className="size-3.5" /></ToolBtn>
          <Separator orientation="vertical" className="mx-0.5 h-4" />
          <ToolBtn title="Heading" onClick={() => prefixLine("## ")}><Heading className="size-3.5" /></ToolBtn>
          <ToolBtn title="List item" onClick={() => prefixLine("- ")}><List className="size-3.5" /></ToolBtn>
          <ToolBtn title="Table" onClick={insertTable}><Table className="size-3.5" /></ToolBtn>
          <ToolBtn title="Inline code" onClick={() => surround("`", "`", "code")}><span className="font-mono text-xs">{"</>"}</span></ToolBtn>
        </div>
        <Textarea
          ref={ref}
          id="md-content"
          value={block.content}
          onChange={e => onChange({ ...block, content: e.target.value })}
          rows={14}
          className="mt-1.5 font-mono text-xs leading-relaxed resize-y"
          placeholder="## Heading&#10;&#10;Write GitHub-flavored Markdown…"
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        Edit raw Markdown here, or double-click the block to edit it inline. Select text in the block to bold, link, or align it — alignment is per-paragraph and exports as an aligned <code className="text-foreground">&lt;div&gt;</code>.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Header inspector
// ---------------------------------------------------------------------------

export function HeaderInspector({ block, onChange }: { block: HeaderBlock; onChange: (b: HeaderBlock) => void }) {
  const s = block.state
  const set = useCallback((patch: Partial<HeaderState>) => onChange({ ...block, state: { ...block.state, ...patch } }), [block, onChange])

  return (
    <div className="space-y-4">
      <Field label="Style">
        <Select value={s.preset} onValueChange={v => set({ preset: v as HeaderState["preset"] })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {HEADER_PRESETS.map(p => (
              <SelectItem key={p} value={p}>{HEADER_PRESET_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Title" htmlFor="hdr-title">
        <Input id="hdr-title" value={s.title} onChange={e => set({ title: e.target.value })} placeholder="Acme Toolkit" />
      </Field>
      <Field label="Subtitle" htmlFor="hdr-sub">
        <Textarea
          id="hdr-sub"
          value={s.subtitle}
          onChange={e => set({ subtitle: e.target.value })}
          placeholder="A delightful component library"
          rows={2}
          className="min-h-9 resize-y text-sm"
        />
      </Field>

      <Field label="Logo">
        <LogoPicker value={/^(data:|https?:\/\/)/.test(s.logo) ? "" : s.logo} onChange={v => set({ logo: v })} />
        <div className="mt-2">
          <SvgIconUpload allowRaster value={s.logo} onChange={v => set({ logo: v })} className="w-full" />
        </div>
      </Field>
      {s.logo ? (
        <Field label="Logo color">
          <ColorInput value={s.logoColor} onChange={v => set({ logoColor: v })} />
        </Field>
      ) : null}

      <Field label="Background image">
        <div className="flex gap-1.5">
          <Input value={s.image} onChange={e => set({ image: e.target.value })} placeholder="Unsplash or image URL" className="text-xs" />
          <Tip label="Random Unsplash photo">
            <Button variant="outline" size="icon" className="size-9 shrink-0" aria-label="Random Unsplash photo" onClick={() => set({ image: randomUnsplashHeader(s.image) })}>
              <Shuffle className="size-3.5" />
            </Button>
          </Tip>
        </div>
      </Field>
      {s.image ? (
        <Field label="Overlay (0–1)">
          <Input value={s.overlay} onChange={e => set({ overlay: e.target.value })} placeholder="0.45" />
        </Field>
      ) : null}

      <Row>
        <Field label="Size">
          <Select value={s.size} onValueChange={v => set({ size: v as HeaderState["size"] })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {HEADER_SIZES.map(sz => <SelectItem key={sz} value={sz}>{HEADER_SIZE_LABELS[sz]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Theme">
          <Select value={s.theme || "_none"} onValueChange={v => set({ theme: v === "_none" ? "" : v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Default</SelectItem>
              {HEADER_THEMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Row>
        <Field label="Align">
          <Select value={s.align} onValueChange={v => set({ align: v as HeaderState["align"] })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="left">Left</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Font">
          <Select value={s.font} onValueChange={v => set({ font: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {HEADER_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Separator />
      <ToggleField label="Border" checked={s.border} onCheckedChange={v => set({ border: v })} />
      <ToggleField label="Watermark" checked={s.watermark} onCheckedChange={v => set({ watermark: v })} />

      <Separator />
      <Field label="Alt text" htmlFor="hdr-alt">
        <Input id="hdr-alt" value={block.alt} onChange={e => onChange({ ...block, alt: e.target.value })} placeholder="header" />
      </Field>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sponsors inspector
// ---------------------------------------------------------------------------

export function SponsorsInspector({ block, onChange }: { block: SponsorsBlock; onChange: (b: SponsorsBlock) => void }) {
  const s = block.state
  const set = useCallback((patch: Partial<SponsorsState>) => onChange({ ...block, state: { ...block.state, ...patch } }), [block, onChange])

  return (
    <div className="space-y-4">
      <Field label="GitHub login (user or org)" htmlFor="sp-login">
        <Input id="sp-login" value={s.login} onChange={e => set({ login: e.target.value })} placeholder="shadcn" />
      </Field>
      <Field label="Title (empty to hide)" htmlFor="sp-title">
        <Input id="sp-title" value={s.title} onChange={e => set({ title: e.target.value })} placeholder="Sponsors" />
      </Field>

      <Separator />
      <ToggleField label="Auto featured tier" checked={s.featured} onCheckedChange={v => set({ featured: v })} />
      <Field label="Special sponsors (logins)" htmlFor="sp-special">
        <Input id="sp-special" value={s.special} onChange={e => set({ special: e.target.value })} placeholder={s.featured ? "auto from Featured sponsors" : "vercel, clerk"} />
      </Field>
      <Field label="Backers (logins)" htmlFor="sp-backers">
        <Input id="sp-backers" value={s.backers} onChange={e => set({ backers: e.target.value })} placeholder="octocat" />
      </Field>

      <Separator />
      <Field label="Background">
        <Select value={s.preset} onValueChange={v => set({ preset: v as SponsorsState["preset"] })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SPONSORS_PRESETS.map(p => (
              <SelectItem key={p} value={p}>{SPONSORS_PRESET_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Row>
        <Field label="Avatar size">
          <Select value={s.size} onValueChange={v => set({ size: v as SponsorsState["size"] })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPONSORS_SIZES.map(sz => <SelectItem key={sz} value={sz}>{SPONSORS_SIZE_LABELS[sz]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Theme">
          <Select value={s.theme || "_none"} onValueChange={v => set({ theme: v === "_none" ? "" : v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Default</SelectItem>
              {SPONSORS_THEMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Row>
        <Field label="Limit" htmlFor="sp-limit">
          <Input id="sp-limit" value={s.limit} onChange={e => set({ limit: e.target.value })} placeholder="60" inputMode="numeric" />
        </Field>
        <Field label="Font">
          <Select value={s.font} onValueChange={v => set({ font: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPONSORS_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Separator />
      <Row>
        <Field label="Title align">
          <Select value={s.titleAlign} onValueChange={v => set({ titleAlign: v as SponsorsState["titleAlign"] })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Avatar align">
          <Select value={s.avatarAlign} onValueChange={v => set({ avatarAlign: v as SponsorsState["avatarAlign"] })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Row>
      <Field label="Tier separator">
        <Select value={s.separator} onValueChange={v => set({ separator: v as SponsorsState["separator"] })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="label">Text labels</SelectItem>
            <SelectItem value="line">Line only</SelectItem>
            <SelectItem value="none">None (spacing)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <ToggleField label="Show Featured tier" checked={s.tierFeatured} onCheckedChange={v => set({ tierFeatured: v })} />
      <ToggleField label="Show Sponsors tier" checked={s.tierSponsors} onCheckedChange={v => set({ tierSponsors: v })} />
      <ToggleField label="Show Backers tier" checked={s.tierBackers} onCheckedChange={v => set({ tierBackers: v })} />

      <Separator />
      <ToggleField label="Names" checked={s.names} onCheckedChange={v => set({ names: v })} />
      <ToggleField label="Border" checked={s.border} onCheckedChange={v => set({ border: v })} />
      <ToggleField label="Watermark" checked={s.watermark} onCheckedChange={v => set({ watermark: v })} />

      <Separator />
      <Field label="Alt text" htmlFor="sp-alt">
        <Input id="sp-alt" value={block.alt} onChange={e => onChange({ ...block, alt: e.target.value })} placeholder="sponsors" />
      </Field>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contributors inspector
// ---------------------------------------------------------------------------

export function ContributorsInspector({ block, onChange }: { block: ContributorsBlock; onChange: (b: ContributorsBlock) => void }) {
  const s = block.state
  const set = useCallback((patch: Partial<ContributorsState>) => onChange({ ...block, state: { ...block.state, ...patch } }), [block, onChange])

  return (
    <div className="space-y-4">
      <Row>
        <Field label="Owner" htmlFor="ct-owner">
          <Input id="ct-owner" value={s.owner} onChange={e => set({ owner: e.target.value })} placeholder="vercel" />
        </Field>
        <Field label="Repository" htmlFor="ct-repo">
          <Input id="ct-repo" value={s.repo} onChange={e => set({ repo: e.target.value })} placeholder="next.js" />
        </Field>
      </Row>
      <Field label="Title (empty to hide)" htmlFor="ct-title">
        <Input id="ct-title" value={s.title} onChange={e => set({ title: e.target.value })} placeholder="Contributors" />
      </Field>

      <Separator />
      <Field label="Background">
        <Select value={s.preset} onValueChange={v => set({ preset: v as ContributorsState["preset"] })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTRIBUTORS_PRESETS.map(p => (
              <SelectItem key={p} value={p}>{CONTRIBUTORS_PRESET_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Row>
        <Field label="Avatar size">
          <Select value={s.size} onValueChange={v => set({ size: v as ContributorsState["size"] })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTRIBUTORS_SIZES.map(sz => <SelectItem key={sz} value={sz}>{CONTRIBUTORS_SIZE_LABELS[sz]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Theme">
          <Select value={s.theme || "_none"} onValueChange={v => set({ theme: v === "_none" ? "" : v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Default</SelectItem>
              {CONTRIBUTORS_THEMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Row>
        <Field label="Limit" htmlFor="ct-limit">
          <Input id="ct-limit" value={s.limit} onChange={e => set({ limit: e.target.value })} placeholder="60" inputMode="numeric" />
        </Field>
        <Field label="Min contributions" htmlFor="ct-min">
          <Input id="ct-min" value={s.min} onChange={e => set({ min: e.target.value })} placeholder="0" inputMode="numeric" />
        </Field>
      </Row>
      <Field label="Font">
        <Select value={s.font} onValueChange={v => set({ font: v })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTRIBUTORS_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Separator />
      <Row>
        <Field label="Title align">
          <Select value={s.titleAlign} onValueChange={v => set({ titleAlign: v as ContributorsState["titleAlign"] })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Avatar align">
          <Select value={s.avatarAlign} onValueChange={v => set({ avatarAlign: v as ContributorsState["avatarAlign"] })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Separator />
      <ToggleField label="Names" checked={s.names} onCheckedChange={v => set({ names: v })} />
      <ToggleField label="Include bots" checked={s.bots} onCheckedChange={v => set({ bots: v })} />
      <ToggleField label="Border" checked={s.border} onCheckedChange={v => set({ border: v })} />
      <ToggleField label="Watermark" checked={s.watermark} onCheckedChange={v => set({ watermark: v })} />

      <Separator />
      <Field label="Alt text" htmlFor="ct-alt">
        <Input id="ct-alt" value={block.alt} onChange={e => onChange({ ...block, alt: e.target.value })} placeholder="contributors" />
      </Field>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Badge item editor (one badge inside a row)
// ---------------------------------------------------------------------------

function BadgeItemEditor({ item, onChange, onRemove, index }: {
  item: BadgeItem
  onChange: (b: BadgeItem) => void
  onRemove: () => void
  index: number
}) {
  const s = item.state
  const set = useCallback((patch: Partial<BuilderState>) => onChange({ ...item, state: { ...item.state, ...patch } }), [item, onChange])

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  const matched = useMemo(() => findPresetForPath(s.path), [s.path])
  const selectedValue = matched ? String(matched.idx) : ""
  const paramValues = useMemo(() => matched?.values ?? {}, [matched])

  const allowed = useMemo(() => allowedVariantsForPath(s.path), [s.path])

  const sections = useMemo<SearchablePickerSection[]>(() => {
    return PRESET_GROUP_NAMES.map(group => {
      const presets = PRESET_GROUPS.get(group) ?? []
      const items = presets
        .filter(p => presetMatchesSearch(p, search, filter))
        .map(p => ({ value: String(BADGE_PRESETS.indexOf(p)), label: getPresetDisplayLabel(p), tag: getPresetService(p) }))
      return { heading: group, items }
    })
  }, [search, filter])

  const onPresetChange = useCallback((indexStr: string) => {
    const idx = parseInt(indexStr, 10)
    const preset = BADGE_PRESETS[idx]
    if (!preset) return
    const values: Record<string, string> = {}
    preset.params.forEach(p => { values[p.key] = p.default })
    const path = resolveTemplate(preset, values)
    const linkUrl = resolveDefaultLinkUrl(preset, values)
    onChange({ ...item, alt: preset.label, state: { ...item.state, path, linkUrl } })
    setSearch("")
  }, [item, onChange])

  const onParamChange = useCallback((paramKey: string, value: string) => {
    if (!matched) return
    const values = { ...paramValues, [paramKey]: value }
    const path = resolveTemplate(matched.preset, values)
    const linkUrl = resolveDefaultLinkUrl(matched.preset, values)
    set({ path, linkUrl })
  }, [matched, paramValues, set])

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Badge {index + 1}</span>
        <div className="flex items-center gap-0.5">
          <Tip label="Save to your badge library">
            <span>
              <SaveBadgeButton
                state={s}
                defaultName={item.alt}
                size="icon"
                variant="ghost"
                className="size-6 text-muted-foreground hover:text-foreground"
              />
            </span>
          </Tip>
          <Tip label="Remove badge">
            <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={`Remove badge ${index + 1}`}>
              <Trash2 className="size-3.5" />
            </Button>
          </Tip>
        </div>
      </div>

      <Field label="Type">
        <SearchablePicker
          value={selectedValue}
          triggerLabel={matched ? getPresetDisplayLabel(matched.preset) : "Custom path"}
          placeholder="Search badge types..."
          emptyLabel="No badge type found."
          search={search}
          onSearchChange={setSearch}
          filters={PRESET_FILTERS}
          activeFilter={filter}
          onFilterChange={setFilter}
          sections={sections}
          onValueChange={onPresetChange}
          triggerClassName="w-full"
          contentClassName="w-[min(420px,calc(100vw-2rem))]"
          listClassName="max-h-[320px]"
        />
      </Field>

      {matched && matched.preset.params.length > 0 ? (
        <div className="space-y-2">
          {matched.preset.params.map(param => (
            <Field key={param.key} label={param.label}>
              <Input
                value={paramValues[param.key] ?? ""}
                onChange={e => onParamChange(param.key, e.target.value)}
                placeholder={param.placeholder}
              />
            </Field>
          ))}
        </div>
      ) : (
        <Field label="Path">
          <Input value={s.path} onChange={e => set({ path: e.target.value })} placeholder="/badge/build-passing-22c55e.svg" className="font-mono text-xs" />
        </Field>
      )}

      <Row>
        <Field label="Variant">
          <Select value={s.variant} onValueChange={v => set({ variant: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VARIANTS.map(v => (
                <SelectItem key={v} value={v} disabled={!allowed.includes(v)}>{VARIANT_LABELS[v] ?? v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Size">
          <Select value={s.size} onValueChange={v => set({ size: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SIZES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Row>
        <Field label="Theme">
          <Select value={s.theme || "_none"} onValueChange={v => set({ theme: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {THEMES.map(v => <SelectItem key={v} value={v}>{v === "_none" ? "Default" : v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Font">
          <Select value={s.font} onValueChange={v => set({ font: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONTS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Field label="Logo">
        <LogoPicker value={s.logo} onChange={v => set({ logo: v })} />
      </Field>

      <Row>
        <Field label="Label override">
          <Input value={s.label} onChange={e => set({ label: e.target.value })} placeholder="auto" />
        </Field>
        <Field label="Color">
          <ColorInput value={s.color} onChange={v => set({ color: v })} />
        </Field>
      </Row>

      <ToggleField label="Split label / value" checked={s.split} onCheckedChange={v => set({ split: v })} />
      {s.split ? (
        <div className="space-y-3 rounded-md border border-dashed border-border bg-background/50 p-3">
          <p className="text-xs text-muted-foreground">Split badges render the label and value as separate pills. Style each side:</p>
          <Row>
            <Field label="Label bg"><ColorInput value={s.labelColor} onChange={v => set({ labelColor: v })} /></Field>
            <Field label="Value bg"><ColorInput value={s.valueColor} onChange={v => set({ valueColor: v })} /></Field>
          </Row>
          <Row>
            <Field label="Label text"><ColorInput value={s.labelTextColor} onChange={v => set({ labelTextColor: v })} /></Field>
            <Field label="Label opacity"><Input value={s.labelOpacity} onChange={e => set({ labelOpacity: e.target.value })} placeholder="0.7" /></Field>
          </Row>
        </div>
      ) : null}

      <Field label="Link URL">
        <Input value={s.linkUrl} onChange={e => set({ linkUrl: e.target.value })} placeholder="https://…" className="text-xs" />
      </Field>
    </div>
  )
}

export function BadgesInspector({ block, onChange }: { block: BadgesBlock; onChange: (b: BadgesBlock) => void }) {
  const updateItem = useCallback((id: string, next: BadgeItem) => {
    onChange({ ...block, badges: block.badges.map(b => (b.id === id ? next : b)) })
  }, [block, onChange])

  const removeItem = useCallback((id: string) => {
    onChange({ ...block, badges: block.badges.filter(b => b.id !== id) })
  }, [block, onChange])

  const addItem = useCallback(() => {
    onChange({ ...block, badges: [...block.badges, makeBadgeItem({ path: "/badge/label-value-22c55e.svg" })] })
  }, [block, onChange])

  const insertSaved = useCallback((state: BuilderState, alt: string) => {
    onChange({ ...block, badges: [...block.badges, makeBadgeItem({ ...state }, alt)] })
  }, [block, onChange])

  const sharedSize = block.badges.length > 0 && block.badges.every(b => b.state.size === block.badges[0].state.size)
    ? block.badges[0].state.size
    : ""

  const setAllSize = useCallback((size: string) => {
    onChange({ ...block, badges: block.badges.map(b => ({ ...b, state: { ...b.state, size } })) })
  }, [block, onChange])

  return (
    <div className="space-y-4">
      <AlignControl value={block.align} onChange={v => onChange({ ...block, align: v })} />
      <Field label="Size — all badges">
        <Select value={sharedSize} onValueChange={setAllSize}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Mixed" /></SelectTrigger>
          <SelectContent>
            {SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Separator />
      <div className="space-y-3">
        {block.badges.map((item, i) => (
          <BadgeItemEditor
            key={item.id}
            item={item}
            index={i}
            onChange={next => updateItem(item.id, next)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={addItem}>
        <Plus className="size-3.5" /> Add badge
      </Button>
      <InsertSavedBadge onInsert={insertSaved} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Group inspector — segments share one group-wide style (the /group/ endpoint
// applies variant/size/theme/font/mode to every segment, no per-segment params)
// ---------------------------------------------------------------------------

function GroupSegmentEditor({ item, onChange, onRemove, index }: {
  item: BadgeItem
  onChange: (b: BadgeItem) => void
  onRemove: () => void
  index: number
}) {
  const s = item.state
  const set = useCallback((patch: Partial<BuilderState>) => onChange({ ...item, state: { ...item.state, ...patch } }), [item, onChange])

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  const matched = useMemo(() => findPresetForPath(s.path), [s.path])
  const selectedValue = matched ? String(matched.idx) : ""
  const paramValues = useMemo(() => matched?.values ?? {}, [matched])

  const sections = useMemo<SearchablePickerSection[]>(() => {
    return PRESET_GROUP_NAMES.map(group => {
      const presets = PRESET_GROUPS.get(group) ?? []
      const items = presets
        .filter(p => presetMatchesSearch(p, search, filter))
        .map(p => ({ value: String(BADGE_PRESETS.indexOf(p)), label: getPresetDisplayLabel(p), tag: getPresetService(p) }))
      return { heading: group, items }
    })
  }, [search, filter])

  const onPresetChange = useCallback((indexStr: string) => {
    const idx = parseInt(indexStr, 10)
    const preset = BADGE_PRESETS[idx]
    if (!preset) return
    const values: Record<string, string> = {}
    preset.params.forEach(p => { values[p.key] = p.default })
    const path = resolveTemplate(preset, values)
    onChange({ ...item, alt: preset.label, state: { ...item.state, path } })
    setSearch("")
  }, [item, onChange])

  const onParamChange = useCallback((paramKey: string, value: string) => {
    if (!matched) return
    const values = { ...paramValues, [paramKey]: value }
    const path = resolveTemplate(matched.preset, values)
    set({ path })
  }, [matched, paramValues, set])

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Segment {index + 1}</span>
        <Tip label="Remove segment">
          <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={`Remove segment ${index + 1}`}>
            <Trash2 className="size-3.5" />
          </Button>
        </Tip>
      </div>

      <Field label="Type">
        <SearchablePicker
          value={selectedValue}
          triggerLabel={matched ? getPresetDisplayLabel(matched.preset) : "Custom path"}
          placeholder="Search badge types..."
          emptyLabel="No badge type found."
          search={search}
          onSearchChange={setSearch}
          filters={PRESET_FILTERS}
          activeFilter={filter}
          onFilterChange={setFilter}
          sections={sections}
          onValueChange={onPresetChange}
          triggerClassName="w-full"
          contentClassName="w-[min(420px,calc(100vw-2rem))]"
          listClassName="max-h-[320px]"
        />
      </Field>

      {matched && matched.preset.params.length > 0 ? (
        <div className="space-y-2">
          {matched.preset.params.map(param => (
            <Field key={param.key} label={param.label}>
              <Input
                value={paramValues[param.key] ?? ""}
                onChange={e => onParamChange(param.key, e.target.value)}
                placeholder={param.placeholder}
              />
            </Field>
          ))}
        </div>
      ) : (
        <Field label="Path">
          <Input value={s.path} onChange={e => set({ path: e.target.value })} placeholder="/badge/build-passing-22c55e.svg" className="font-mono text-xs" />
        </Field>
      )}
    </div>
  )
}

export function GroupInspector({ block, onChange }: { block: GroupBlock; onChange: (b: GroupBlock) => void }) {
  const updateItem = useCallback((id: string, next: BadgeItem) => {
    onChange({ ...block, badges: block.badges.map(b => (b.id === id ? next : b)) })
  }, [block, onChange])

  const removeItem = useCallback((id: string) => {
    onChange({ ...block, badges: block.badges.filter(b => b.id !== id) })
  }, [block, onChange])

  const addItem = useCallback(() => {
    onChange({ ...block, badges: [...block.badges, makeBadgeItem({ path: "/badge/label-value-22c55e.svg" })] })
  }, [block, onChange])

  return (
    <div className="space-y-4">
      <AlignControl value={block.align} onChange={v => onChange({ ...block, align: v })} />

      <Field label="Alt text">
        <Input value={block.alt} onChange={e => onChange({ ...block, alt: e.target.value })} placeholder="badge group" />
      </Field>

      <p className="text-xs text-muted-foreground">Style applies to the whole group — every segment shares one variant, size, theme, and font.</p>

      <Row>
        <Field label="Variant">
          <Select value={block.variant} onValueChange={v => onChange({ ...block, variant: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VARIANTS.map(v => <SelectItem key={v} value={v}>{VARIANT_LABELS[v] ?? v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Size">
          <Select value={block.size} onValueChange={v => onChange({ ...block, size: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SIZES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Row>
        <Field label="Theme">
          <Select value={block.theme || "_none"} onValueChange={v => onChange({ ...block, theme: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {THEMES.map(v => <SelectItem key={v} value={v}>{v === "_none" ? "Default" : v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Font">
          <Select value={block.font} onValueChange={v => onChange({ ...block, font: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONTS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Field label="Link URL">
        <Input value={block.link ?? ""} onChange={e => onChange({ ...block, link: e.target.value })} placeholder="https://…" className="text-xs" />
      </Field>

      <Separator />
      <div className="space-y-3">
        {block.badges.map((item, i) => (
          <GroupSegmentEditor
            key={item.id}
            item={item}
            index={i}
            onChange={next => updateItem(item.id, next)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={addItem}>
        <Plus className="size-3.5" /> Add segment
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart inspector
// ---------------------------------------------------------------------------

export function ChartInspector({ block, onChange }: { block: ChartBlock; onChange: (b: ChartBlock) => void }) {
  const s = block.state
  const set = useCallback((patch: Partial<ChartState>) => onChange({ ...block, state: { ...block.state, ...patch } }), [block, onChange])

  return (
    <div className="space-y-4">
      <Field label="Chart">
        <Select value={s.kind} onValueChange={v => set({ kind: v as ChartState["kind"] })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="stars">GitHub stars</SelectItem>
            <SelectItem value="issues">GitHub issues</SelectItem>
            <SelectItem value="commits">GitHub commits</SelectItem>
            <SelectItem value="npm">npm downloads</SelectItem>
            <SelectItem value="json">Inline JSON</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {(s.kind === "stars" || s.kind === "issues") ? (
        <Row>
          <Field label="Owner"><Input value={s.owner} onChange={e => set({ owner: e.target.value })} placeholder="vercel" /></Field>
          <Field label="Repo"><Input value={s.repo} onChange={e => set({ repo: e.target.value })} placeholder="next.js" /></Field>
        </Row>
      ) : null}

      {s.kind === "commits" ? (
        <>
          <Field label="User(s)"><Input value={s.user} onChange={e => set({ user: e.target.value })} placeholder="torvalds or torvalds,gaearon" /></Field>
          <ToggleField label="Aligned (line up at account birth)" checked={s.aligned} onCheckedChange={v => set({ aligned: v })} />
        </>
      ) : null}

      {s.kind === "npm" ? (
        <Row>
          <Field label="Package"><Input value={s.package} onChange={e => set({ package: e.target.value })} placeholder="zod" /></Field>
          <Field label="Days"><Input value={s.days} onChange={e => set({ days: e.target.value })} placeholder="365" /></Field>
        </Row>
      ) : null}

      {s.kind === "json" ? (
        <>
          <Field label="Values (comma-separated)">
            <Input value={s.values} onChange={e => set({ values: e.target.value })} placeholder="10,25,40,30,60" className="font-mono text-xs" />
          </Field>
          <Field label="Data label"><Input value={s.dataLabel} onChange={e => set({ dataLabel: e.target.value })} placeholder="optional" /></Field>
        </>
      ) : null}

      <Field label="Title"><Input value={s.title} onChange={e => set({ title: e.target.value })} placeholder="optional" /></Field>

      <Row>
        <Field label="Theme">
          <Select value={s.theme} onValueChange={v => set({ theme: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHART_THEMES.map(t => <SelectItem key={t} value={t}>{t === "_none" ? "Default" : t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Font">
          <Select value={s.font} onValueChange={v => set({ font: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHART_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </Row>

      <Row>
        <Field label="Line color"><ColorInput value={s.color} onChange={v => set({ color: v })} /></Field>
        <Field label="Fill color"><ColorInput value={s.fill} onChange={v => set({ fill: v })} /></Field>
      </Row>

      <Row>
        <Field label="Width"><Input value={s.width} onChange={e => set({ width: e.target.value })} placeholder="800" /></Field>
        <Field label="Height"><Input value={s.height} onChange={e => set({ height: e.target.value })} placeholder="400" /></Field>
      </Row>

      <Field label="Icon (SimpleIcons slug)">
        <LogoPicker value={s.icon} onChange={v => set({ icon: v })} />
      </Field>

      <Separator />
      <ToggleField label="Area fill" checked={s.area} onCheckedChange={v => set({ area: v })} />
      <ToggleField label="Border" checked={s.border} onCheckedChange={v => set({ border: v })} />
      <ToggleField label="Logo watermark" checked={s.logo} onCheckedChange={v => set({ logo: v })} />
      <ToggleField label="Transparent background" checked={s.transparent} onCheckedChange={v => set({ transparent: v })} />

      <Separator />
      <AlignControl value={block.align} onChange={v => onChange({ ...block, align: v })} />
      <Field label="Alt text"><Input value={block.alt} onChange={e => onChange({ ...block, alt: e.target.value })} placeholder="chart" /></Field>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table inspector — spreadsheet-style grid editor
// ---------------------------------------------------------------------------

const ALIGN_ICON: Record<Alignment, React.ComponentType<{ className?: string }>> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
}

function nextAlign(a: Alignment): Alignment {
  return a === "left" ? "center" : a === "center" ? "right" : "left"
}

export function TableInspector({ block, onChange }: { block: TableBlock; onChange: (b: TableBlock) => void }) {
  const cols = block.headers.length

  const setHeader = (c: number, val: string) => {
    const headers = block.headers.slice(); headers[c] = val
    onChange({ ...block, headers })
  }
  const setAlign = (c: number) => {
    const aligns = block.aligns.slice(); aligns[c] = nextAlign(aligns[c] ?? "left")
    onChange({ ...block, aligns })
  }
  const setCell = (r: number, c: number, val: string) => {
    const rows = block.rows.map(row => row.slice())
    while (rows[r].length < cols) rows[r].push("")
    rows[r][c] = val
    onChange({ ...block, rows })
  }
  const addColumn = () => onChange({
    ...block,
    headers: [...block.headers, "Column"],
    aligns: [...block.aligns, "left"],
    rows: block.rows.map(row => [...row, ""]),
  })
  const removeColumn = (c: number) => onChange({
    ...block,
    headers: block.headers.filter((_, i) => i !== c),
    aligns: block.aligns.filter((_, i) => i !== c),
    rows: block.rows.map(row => row.filter((_, i) => i !== c)),
  })
  const addRow = () => onChange({ ...block, rows: [...block.rows, Array.from({ length: cols }, () => "")] })
  const removeRow = (r: number) => onChange({ ...block, rows: block.rows.filter((_, i) => i !== r) })

  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(92px, 1fr)) 1.75rem` }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={addColumn}><Plus className="size-3.5" /> Column</Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={addRow}><Plus className="size-3.5" /> Row</Button>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-full gap-1" style={gridStyle}>
          {/* Delete-column buttons */}
          {block.headers.map((_, c) => (
            <Tip key={`del-${c}`} label="Delete column">
              <button
                className="flex h-5 items-center justify-center rounded text-muted-foreground/50 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-30"
                onClick={() => removeColumn(c)}
                disabled={cols <= 1}
                aria-label={`Delete column ${c + 1}`}
              >
                <Trash2 className="size-3" />
              </button>
            </Tip>
          ))}
          <span />

          {/* Header inputs */}
          {block.headers.map((h, c) => (
            <Input key={`h-${c}`} value={h} onChange={e => setHeader(c, e.target.value)} placeholder="Header" className="h-8 text-xs font-medium" />
          ))}
          <span />

          {/* Per-column alignment */}
          {block.headers.map((_, c) => {
            const a = block.aligns[c] ?? "left"
            const Icon = ALIGN_ICON[a]
            return (
              <Tip key={`a-${c}`} label={`Column alignment: ${a} — click to change`}>
                <button
                  className="flex h-6 items-center justify-center gap-1 rounded border border-border bg-muted/40 text-[10px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => setAlign(c)}
                  aria-label={`Column ${c + 1} alignment: ${a}`}
                >
                  <Icon className="size-3" /> {a}
                </button>
              </Tip>
            )
          })}
          <span />

          {/* Body cells */}
          {block.rows.map((row, r) => (
            <Fragment key={`r-${r}`}>
              {block.headers.map((_, c) => (
                <Input key={`c-${r}-${c}`} value={row[c] ?? ""} onChange={e => setCell(r, c, e.target.value)} placeholder="—" className="h-8 text-xs" />
              ))}
              <Tip label="Delete row">
                <button
                  className="flex items-center justify-center rounded text-muted-foreground/50 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-30"
                  onClick={() => removeRow(r)}
                  disabled={block.rows.length <= 1}
                  aria-label={`Delete row ${r + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </Tip>
            </Fragment>
          ))}
        </div>
      </div>

      <Separator />
      <AlignControl value={block.align ?? "left"} onChange={v => onChange({ ...block, align: v })} />
      <p className="text-xs text-muted-foreground">Edit cells directly like a spreadsheet. Click a column’s alignment chip to cycle left / center / right. Exports as a GitHub-flavored Markdown table.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Image inspector
// ---------------------------------------------------------------------------

export function ImageInspector({ block, onChange }: { block: ImageBlock; onChange: (b: ImageBlock) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Image URL or path" htmlFor="img-src">
        <div className="flex gap-1.5">
          <Input
            id="img-src"
            value={block.src}
            onChange={e => onChange({ ...block, src: e.target.value })}
            placeholder={PLACEHOLDER_IMAGE}
            className="font-mono text-xs"
          />
          <Tip label="Random placeholder image">
            <Button variant="outline" size="icon" className="size-9 shrink-0" aria-label="Random placeholder image" onClick={() => onChange({ ...block, src: randomPlaceholder(block.src) })}>
              <Shuffle className="size-3.5" />
            </Button>
          </Tip>
        </div>
      </Field>
      <p className="text-xs text-muted-foreground">Paste any image URL or a repo-relative path (e.g. <code className="text-foreground">./docs/hero.png</code>). The shuffle button drops in a placeholder photo.</p>

      <Field label="Alt text" htmlFor="img-alt">
        <Input id="img-alt" value={block.alt} onChange={e => onChange({ ...block, alt: e.target.value })} placeholder="image" />
      </Field>

      <Row>
        <Field label="Width (px)"><Input value={block.width ?? ""} onChange={e => onChange({ ...block, width: e.target.value })} placeholder="auto" /></Field>
        <Field label="Link URL"><Input value={block.link ?? ""} onChange={e => onChange({ ...block, link: e.target.value })} placeholder="https://…" className="text-xs" /></Field>
      </Row>

      <Separator />
      <AlignControl value={block.align ?? "left"} onChange={v => onChange({ ...block, align: v })} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Re-export grip icon for the layers panel convenience.
// ---------------------------------------------------------------------------
export { GripVertical }
export { cn }
