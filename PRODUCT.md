# Product

## Register

product

## Users

Open-source maintainers and developers assembling a GitHub README, npm page, or
docs site. They are technical, comfortable with Markdown, and value speed and
correctness over hand-holding. The job to be done: compose a complete README
(headers, badges, charts, tables, images, and prose) visually, then export
clean, copy-paste Markdown they trust.

## Product Purpose

shieldcn serves styled SVG/PNG badges and charts rendered as shadcn/ui
components. The README Studio (`/studio`) is the visual composer: a Figma-style
editor with a block document, a live preview, and a property inspector that maps
to the real badge/header/chart props. Success is a maintainer building and
exporting a README in minutes without writing badge URLs by hand, with output
that renders identically on GitHub.

## Brand Personality

Precise, technical, quietly confident. The product is a dev tool, so it should
feel like Linear or Raycast: familiar, fast, and out of the way. Three words:
exact, calm, legible. It practices what it preaches by being styled exactly like
the shadcn/ui components it generates.

## Anti-references

Generic SaaS landing-page slop: gradient-text hero metrics, decorative
glassmorphism, marketing buzzwords, oversized fluid display type in tool chrome,
invented affordances for standard actions (custom modals/scrollbars). No
playful/illustrative app aesthetic; this is a developer instrument.

## Design Principles

- Earned familiarity: standard editor patterns (layers, inspector, canvas) so a
  user fluent in Figma/Notion trusts it immediately.
- Practice what you preach: the studio is built from the same shadcn/ui tokens
  and components it generates.
- The tool disappears into the task: motion conveys state only; density where
  it helps; no choreography that makes users wait.
- Output integrity: the preview matches the exported Markdown, and the export is
  clean GitHub-flavored Markdown.

## Accessibility & Inclusion

WCAG 2.1 AA. Body text ≥ 4.5:1, large/UI text ≥ 3:1. Every interactive control
keyboard-operable with a visible focus indicator. Respect
`prefers-reduced-motion`. Icon-only controls carry accessible names and
tooltips. Badge output must remain readable in both light and dark modes.
