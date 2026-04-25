# Contributing to shieldcn

Thanks for your interest in contributing! This guide covers the conventions enforced across the project so your PRs land smoothly.

## Getting started

```bash
pnpm install
pnpm dev
```

Husky git hooks install automatically via `pnpm install`. They enforce commit messages, branch names, and linting before code ever leaves your machine.

## Branch naming

Branches **must** follow [Conventional Branch](https://conventional-branch.github.io/) format. This is enforced locally via a Husky `pre-push` hook and in CI via [commit-check](https://github.com/commit-check/commit-check-action).

```
<type>/<description>
```

| Type | Use for |
|------|---------|
| `feat` or `feature` | New features or enhancements |
| `fix` or `bugfix` | Bug fixes |
| `hotfix` | Urgent production fixes |
| `docs` | Documentation only |
| `refactor` | Code restructuring (no behavior change) |
| `perf` | Performance improvements |
| `style` | Formatting, CSS, visual changes |
| `test` | Adding or updating tests |
| `ci` or `build` | CI/CD pipeline changes |
| `chore` | Maintenance, deps, tooling |
| `release` | Release prep |

**Rules:**

- Lowercase alphanumerics, hyphens, and dots only
- No consecutive hyphens or dots
- No leading/trailing hyphens or dots in the description

**Examples:**

```
feat/discord-provider
fix/satori-opacity-bug
docs/add-pypi-guide
refactor/split-render-pipeline
chore/update-dependencies
hotfix/security-patch
release/v1.2.0
```

## Commit messages

Commits **must** follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). This is enforced locally via a Husky `commit-msg` hook and in CI.

```
<type>(<scope>): <description>
```

| Type | Use for |
|------|---------|
| `feat` | New features |
| `fix` | Bug fixes |
| `docs` | Documentation |
| `refactor` | Restructuring without behavior change |
| `perf` | Performance improvements |
| `style` | Formatting (not CSS — code style) |
| `test` | Tests |
| `ci` | CI/CD changes |
| `build` | Build system changes |
| `chore` | Maintenance and tooling |
| `revert` | Reverting a previous commit |

**Rules:**

- Subject line max **80 characters**
- Scope is optional but encouraged (e.g., `badges`, `providers`, `docs`)
- Use `!` after the type/scope for breaking changes: `feat!: remove v1 endpoints`
- Merge, revert, and fixup commits are allowed as-is

**Examples:**

```
feat(badges): add split mode for two-tone badges
fix: handle null response in npm provider
docs: update API reference with new query params
chore(deps): bump satori to v0.12
ci: add PR auto-labeler workflow
feat!: remove deprecated static badge endpoint
```

## Issues

When opening an issue, pick the template that fits:

| Template | When to use |
|----------|-------------|
| 🐛 **Bug Report** | A badge is broken, showing wrong data, or returning an error |
| ✨ **Feature Request** | New customization, query param, or enhancement |
| 📦 **New Provider** | Request support for a new service (Hex.pm, Cargo, etc.) |
| Blank issue | Anything else |

Issues tagged `good first issue` are a great starting point if you're new to the project.

## Pull requests

A PR template will pre-fill when you open a pull request. Fill in the **What**, **Why**, and **Type** sections, and check off the items in the checklist.

### Auto-labeling

PRs are automatically labeled based on your **branch name prefix**:

| Branch prefix | Label |
|---------------|-------|
| `feat/`, `feature/` | `feature` |
| `fix/`, `bugfix/`, `hotfix/` | `bug` |
| `docs/` | `docs` |
| `refactor/` | `refactor` |
| `perf/` | `perf` |
| `style/` | `style` |
| `test/` | `test` |
| `ci/`, `build/` | `ci` |
| `chore/` | `chore` |

Labels also apply based on **changed files** — for example, touching `.github/**` adds `ci`, and touching `content/docs/**` adds `docs`, even on a `feat/` branch. Labels sync on every push, so outdated labels are removed automatically.

### Labels

Here are all the labels used across issues and PRs:

| Label | Description |
|-------|-------------|
| `feature` | New feature or enhancement |
| `bug` | Something isn't working |
| `provider` | New or updated badge provider |
| `docs` | Documentation changes |
| `refactor` | Code restructuring |
| `perf` | Performance improvement |
| `style` | Visual and CSS changes |
| `test` | Tests |
| `ci` | CI/CD and workflow changes |
| `chore` | Maintenance and dependencies |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention is needed |

## Code style

- No semicolons
- Double quotes
- `@/*` import alias
- ESLint runs on staged `.ts`/`.tsx` files via `lint-staged`

## Project structure

```
app/                    # Next.js routes
  [...slug]/            # Badge render endpoint (catch-all)
  docs/                 # Docs layout
  gallery/              # Icon gallery page
  showcase/             # Badge showcase page
  sponsor/              # Sponsor page
  token-pool/           # GitHub token pool OAuth
components/             # Shared React components
content/docs/           # Fumadocs MDX pages
lib/
  badges/               # Badge renderer, tokens, icon resolution
  providers/            # Data providers (npm, GitHub, Discord, etc.)
  fonts/                # Inter Medium TTF for Satori
  token-pool.ts         # GitHub token pool logic
```

## Need help?

Open an issue or start a discussion — happy to help you get your first PR merged.
