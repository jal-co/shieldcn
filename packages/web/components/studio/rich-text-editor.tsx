/**
 * shieldcn
 * components/studio/rich-text-editor
 *
 * WYSIWYG inline editor for Studio text blocks. Built on Tiptap (ProseMirror)
 * with a selection bubble menu (bold, italic, code, H1/H2/H3, blockquote, link,
 * lists). Content round-trips to Markdown via tiptap-markdown so the exported
 * README stays clean Markdown — the editor never exposes raw syntax.
 *
 * Loaded lazily (ssr: false) from the canvas so Tiptap stays out of the
 * initial Studio bundle until a text block is actually edited.
 */

"use client"

import { useRef } from "react"
import { useEditor, EditorContent, useEditorState } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Paragraph from "@tiptap/extension-paragraph"
import Heading from "@tiptap/extension-heading"
import TextAlign from "@tiptap/extension-text-align"
import { Markdown } from "tiptap-markdown"
import { IconAlignmentLeft } from "@central-icons-react/round-filled-radius-1-stroke-1.5/IconAlignmentLeft"
import { IconAlignmentCenter } from "@central-icons-react/round-filled-radius-1-stroke-1.5/IconAlignmentCenter"
import { IconAlignmentRight } from "@central-icons-react/round-filled-radius-1-stroke-1.5/IconAlignmentRight"
import { IconBold } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconBold"
import { IconCloseQuote2 } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconCloseQuote2"
import { IconItalic } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconItalic"
import { IconCodeLarge } from "@central-icons-react/round-filled-radius-1-stroke-1.5/IconCodeLarge"
import { IconChainLink4 } from "@central-icons-react/round-filled-radius-1-stroke-1.5/IconChainLink4"
import { IconH1 } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconH1"
import { IconH2 } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconH2"
import { IconH3 } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconH3"
import { IconBulletList } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconBulletList"
import { IconNumberedList } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconNumberedList"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  /** Called with the new Markdown when editing ends (blur / ⌘↵). */
  onCommit: (markdown: string) => void
  /** Called when editing is abandoned (Esc) — no content change. */
  onCancel: () => void
}

// prosemirror-markdown serializer state (only the methods we call).
interface MdSerializerState {
  write(content: string): void
  renderInline(node: unknown): void
  closeBlock(node: unknown): void
  repeat(s: string, n: number): string
}
interface MdNode {
  attrs: { textAlign?: string | null; level?: number }
}

// GitHub-flavored Markdown has no CSS text-align, so a centered/right-aligned
// paragraph or heading is serialized as a `<div align="…">` wrapper (which GitHub
// renders, and which our importer reads back). Left/default stays plain Markdown.
const AlignParagraph = Paragraph.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: MdSerializerState, node: MdNode) {
          const a = node.attrs.textAlign
          if (a && a !== "left") {
            state.write(`<div align="${a}">\n\n`)
            state.renderInline(node)
            state.write("\n\n</div>")
            state.closeBlock(node)
          } else {
            state.renderInline(node)
            state.closeBlock(node)
          }
        },
        // Round-trip: turn `<div align="…">` wrappers back into per-block
        // text-align so re-editing keeps (and the toolbar reflects) alignment.
        parse: {
          updateDOM(element: HTMLElement) {
            element.querySelectorAll("div[align]").forEach(div => {
              const align = div.getAttribute("align")
              if (align) {
                div.querySelectorAll(":scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6")
                  .forEach(child => { (child as HTMLElement).style.textAlign = align })
              }
              const parent = div.parentNode
              if (!parent) return
              while (div.firstChild) parent.insertBefore(div.firstChild, div)
              parent.removeChild(div)
            })
          },
        },
      },
    }
  },
})

const AlignHeading = Heading.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: MdSerializerState, node: MdNode) {
          const a = node.attrs.textAlign
          const open = a && a !== "left"
          if (open) state.write(`<div align="${a}">\n\n`)
          state.write(state.repeat("#", node.attrs.level ?? 1) + " ")
          state.renderInline(node)
          if (open) state.write("\n\n</div>")
          state.closeBlock(node)
        },
        parse: {},
      },
    }
  },
})

function ToolButton({ active, onRun, label, children }: {
  active?: boolean
  onRun: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      // preventDefault keeps the editor selection so the command applies to it.
      onMouseDown={e => e.preventDefault()}
      onClick={onRun}
      className={cn(
        "flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
      )}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({ value, onCommit, onCancel }: RichTextEditorProps) {
  const cancelled = useRef(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Swap in alignment-aware paragraph/heading so we control Markdown output.
      StarterKit.configure({ link: { openOnClick: false }, paragraph: false, heading: false }),
      AlignParagraph,
      AlignHeading,
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }),
      Markdown.configure({ html: true, transformPastedText: true, transformCopiedText: true }),
    ],
    content: value,
    autofocus: "end",
    editorProps: {
      attributes: {
        // Match the rendered (ReactMarkdown) prose exactly so toggling into
        // edit mode does not shift or resize the block.
        class: "prose prose-sm dark:prose-invert max-w-none prose-headings:scroll-m-0 prose-pre:bg-muted prose-pre:text-foreground focus:outline-none",
      },
    },
    onBlur: ({ editor }) => {
      if (cancelled.current) { cancelled.current = false; onCancel(); return }
      const md = (editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown
      onCommit(md.getMarkdown())
    },
  })

  // Reactive active-mark/-node flags. In Tiptap v3 useEditor no longer re-renders
  // on every transaction, so the bubble-menu buttons need useEditorState to show
  // their toggled-on state.
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      code: e?.isActive("code") ?? false,
      h1: e?.isActive("heading", { level: 1 }) ?? false,
      h2: e?.isActive("heading", { level: 2 }) ?? false,
      h3: e?.isActive("heading", { level: 3 }) ?? false,
      bullet: e?.isActive("bulletList") ?? false,
      ordered: e?.isActive("orderedList") ?? false,
      quote: e?.isActive("blockquote") ?? false,
      alignLeft: e?.isActive({ textAlign: "left" }) ?? false,
      alignCenter: e?.isActive({ textAlign: "center" }) ?? false,
      alignRight: e?.isActive({ textAlign: "right" }) ?? false,
      link: e?.isActive("link") ?? false,
    }),
  })

  if (!editor || !active) {
    return <div className="min-h-[2rem] animate-pulse rounded-md bg-muted/40" />
  }

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Link URL", prev ?? "https://")
    if (url === null) return
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  return (
    <div
      // No border/padding/bg of its own — the selected block frame already
      // frames it, so editing stays in place instead of growing the box.
      className="outline-none"
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === "Escape") { e.preventDefault(); cancelled.current = true; editor.commands.blur() }
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); editor.commands.blur() }
      }}
    >
      <BubbleMenu editor={editor}>
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-md">
          <ToolButton label="Bold" active={active.bold} onRun={() => editor.chain().focus().toggleBold().run()}><IconBold size={14} /></ToolButton>
          <ToolButton label="Italic" active={active.italic} onRun={() => editor.chain().focus().toggleItalic().run()}><IconItalic size={14} /></ToolButton>
          <ToolButton label="Inline code" active={active.code} onRun={() => editor.chain().focus().toggleCode().run()}><IconCodeLarge size={14} /></ToolButton>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <ToolButton label="Heading 1" active={active.h1} onRun={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><IconH1 size={14} /></ToolButton>
          <ToolButton label="Heading 2" active={active.h2} onRun={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><IconH2 size={14} /></ToolButton>
          <ToolButton label="Heading 3" active={active.h3} onRun={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><IconH3 size={14} /></ToolButton>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <ToolButton label="Bullet list" active={active.bullet} onRun={() => editor.chain().focus().toggleBulletList().run()}><IconBulletList size={14} /></ToolButton>
          <ToolButton label="Numbered list" active={active.ordered} onRun={() => editor.chain().focus().toggleOrderedList().run()}><IconNumberedList size={14} /></ToolButton>
          <ToolButton label="Blockquote" active={active.quote} onRun={() => editor.chain().focus().toggleBlockquote().run()}><IconCloseQuote2 size={14} /></ToolButton>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <ToolButton label="Align left" active={active.alignLeft} onRun={() => editor.chain().focus().setTextAlign("left").run()}><IconAlignmentLeft size={14} /></ToolButton>
          <ToolButton label="Align center" active={active.alignCenter} onRun={() => editor.chain().focus().setTextAlign("center").run()}><IconAlignmentCenter size={14} /></ToolButton>
          <ToolButton label="Align right" active={active.alignRight} onRun={() => editor.chain().focus().setTextAlign("right").run()}><IconAlignmentRight size={14} /></ToolButton>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <ToolButton label="Link" active={active.link} onRun={setLink}><IconChainLink4 size={14} /></ToolButton>
        </div>
      </BubbleMenu>
      <EditorContent editor={editor} />
    </div>
  )
}
