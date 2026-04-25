# shieldcn Registry Plan

## Goal

Build a **small shadcn-compatible registry surface** that drives discovery and traffic from the shadcn ecosystem **without changing shieldcn's core positioning**.

shieldcn remains:

- a **Markdown / README badge service first**
- a **drop-in SVG badge service**
- a **shields.io alternative with shadcn/ui visual quality**

The registry is a **distribution channel**, not the product identity.

---

## Product Positioning

### Public positioning

> shieldcn is a Markdown badge service with the visual quality of shadcn/ui.

### Internal strategy

> shieldcn also ships a shadcn-compatible registry to capture search traffic,
> registry installs, and component discovery intent.

### Important constraint

Do **not** reposition the homepage or top-level messaging around "being a registry."

The registry should be presented as:

- an integration layer
- a React/shadcn convenience layer
- an installable helper surface for shieldcn badges

---

## v1 Scope

Ship **3 components** only.

This should be intentionally small and high-signal.

### 1. `readme-badge`

**Purpose:** the main registry entrypoint.

This is the clearest bridge from shadcn traffic to shieldcn usage.

It should:

- render a shieldcn badge URL
- be tiny and dependency-light
- support simple props like:
  - `src`
  - `alt`
  - `href?`
  - `className?`
  - `imgClassName?`

Example:

```tsx
<ReadmeBadge
  src="https://shieldcn.dev/npm/react.svg?variant=branded"
  alt="React npm version"
/>
```

### 2. `readme-badge-row`

**Purpose:** polished grouping for multiple badges.

This should:

- lay out multiple badges cleanly
- wrap nicely
- feel like a reusable shadcn-style primitive
- work well in docs pages, landing pages, and app settings pages

Example:

```tsx
<ReadmeBadgeRow>
  <ReadmeBadge src="https://shieldcn.dev/npm/react.svg" alt="npm" />
  <ReadmeBadge src="https://shieldcn.dev/github/vercel/next.js/stars.svg" alt="stars" />
</ReadmeBadgeRow>
```

### 3. `badge-preview`

**Purpose:** visual badge demo component for docs and app UIs.

This should be adapted from the current shieldcn preview component, but simplified for registry use.

It should:

- render a live badge preview
- optionally show example code below it
- fit docs and demos
- stay dependency-light

---

## What Not to Ship in v1

Do **not** ship these as registry items yet:

- badge builder
- badge modal
- badge marquee
- showcase internals
- sidebar docs internals
- token pool UI
- auth flows
- homepage sections
- provider-specific giant preset packs

The registry should not feel like a dump of site internals.

---

## Naming and Registry Alias

Use:

```json
{
  "registries": {
    "@shieldcn": "https://shieldcn.dev/r/{name}.json"
  }
}
```

Install commands should look like:

```bash
pnpm dlx shadcn@latest add @shieldcn/readme-badge
pnpm dlx shadcn@latest add @shieldcn/readme-badge-row
pnpm dlx shadcn@latest add @shieldcn/badge-preview
```

This is important for brand consistency and memorability.

---

## Styling Rules

Registry components must feel consistent with the shieldcn site and current design system.

### Typography

Use the current site typography conventions:

- **headings:** Sora
- **body/UI:** Geist
- **mono/code:** Fira Code

Registry-installed components should rely on the consumer project's existing typography tokens where possible.

### Component style expectations

Registry components should:

- feel shadcn-native
- use rounded corners consistent with current shieldcn UI
- avoid hardcoded visual gimmicks
- use subtle borders and muted surfaces
- favor clean spacing and simple composition
- avoid over-styled marketing chrome

### Color and theming

Components should:

- support dark and light mode naturally
- use semantic tokens when possible
- avoid assuming a specific background
- not require shieldcn site CSS to look correct

### Installability standard

Each registry item should:

- minimize dependencies
- avoid requiring unrelated site-only utilities
- avoid dragging in large internal systems
- be installable in isolation

---

## Documentation Strategy

Create a new docs section for registry content.

The docs should visually and structurally align with the shadcn registry documentation style, while staying specific to shieldcn.

Use this MDX frontmatter and intro style as the reference pattern:

```mdx
---
title: Introduction
description: Run your own code registry.
---

You can use the `shadcn` CLI to run your own code registry. Running your own registry allows you to distribute your custom components, hooks, pages, config, rules and other files to any project.

<Callout>
  **Note:** The registry works with any project type and any framework, and is
  not limited to React.
</Callout>
```

Reference:

- https://ui.shadcn.com/docs/registry

### Important adaptation for shieldcn

Do **not** copy the shadcn docs verbatim.

Instead, adapt the structure and tone to shieldcn's use case:

- install shieldcn helpers via the shadcn registry
- use them to render or preview shieldcn badges
- link back to the hosted badge service

### Recommended docs pages

#### `/docs/registry`

Landing page for registry docs.

Should explain:

- what the registry is
- why shieldcn ships registry items
- how it complements the hosted badge service
- which components are available

#### `/docs/registry/getting-started`

Should cover:

- adding the `@shieldcn` registry alias
- installing the first component
- using `readme-badge`

#### `/docs/registry/components`

Should list and demo the v1 items:

- `readme-badge`
- `readme-badge-row`
- `badge-preview`

#### `/docs/registry/examples`

Should show:

- hero-style badge rows
- README-style examples
- docs-style preview blocks

---

## Docs UI Pattern

When building the docs landing page, use a structure inspired by the shadcn registry docs page.

Example content structure to adapt:

```mdx
---
title: Introduction
description: Run your own code registry.
---

You can use the `shadcn` CLI to run your own code registry. Running your own registry allows you to distribute your custom components, hooks, pages, config, rules and other files to any project.

<Callout>
  **Note:** The registry works with any project type and any framework, and is
  not limited to React.
</Callout>

<figure className="flex flex-col gap-4">
  <Image
    src="/images/registry-light.png"
    width="1432"
    height="960"
    alt="Registry"
    className="mt-6 w-full overflow-hidden rounded-lg border dark:hidden"
  />
  <Image
    src="/images/registry-dark.png"
    width="1432"
    height="960"
    alt="Registry"
    className="mt-6 hidden w-full overflow-hidden rounded-lg border shadow-sm dark:block"
  />
  <figcaption className="text-center text-sm text-gray-500">
    A distribution system for code
  </figcaption>
</figure>
```

### For shieldcn, swap the messaging to:

- install React helpers for shieldcn badges
- use the hosted badge service in apps/docs/components
- keep the examples badge-focused

### Suggested CTA cards

Use linked cards similar to the shadcn docs style, but for these routes:

- `/docs/registry/getting-started`
- `/docs/registry/components`
- `/docs/registry/examples`
- `/docs/registry/schema`

---

## Technical Architecture

### Routes

Create a registry route:

- `app/r/[name]/route.ts`

Optional later:

- `app/r/index/route.ts`
- namespace support

### Source layout

Suggested structure:

```txt
registry/
  readme-badge.tsx
  readme-badge-row.tsx
  badge-preview.tsx

lib/registry/
  items.ts
  types.ts
  build-item.ts
```

### Responsibility split

#### `registry/`

Contains installable source files/templates.

#### `lib/registry/items.ts`

Defines the item registry map and metadata.

#### `lib/registry/build-item.ts`

Builds the registry JSON payload returned by `/r/{name}.json`.

---

## v1 Delivery Order

### Step 1

Build registry infrastructure:

- registry route
- item type definitions
- one sample item response

### Step 2

Ship `readme-badge`

This is the first and most important installable component.

### Step 3

Ship `readme-badge-row`

### Step 4

Ship `badge-preview`

### Step 5

Add docs pages and sidebar navigation

---

## Success Criteria

v1 is successful if:

- users can install `@shieldcn/readme-badge`
- users can install `@shieldcn/readme-badge-row`
- users can install `@shieldcn/badge-preview`
- registry docs are clear and polished
- registry content drives traffic without confusing shieldcn's core identity

---

## Final Principle

The registry should make people discover shieldcn.

It should **not** make people wonder whether shieldcn is a registry product or a badge service.

shieldcn remains the badge service.
The registry is the growth layer.
