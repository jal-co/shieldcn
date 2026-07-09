## @shieldcn/action@1.0.0

### shieldcn starchart

Initial release of the shieldcn starchart GitHub Action.

GitHub restricted the stargazers `starred_at` API to repo admins and
collaborators, which killed hosted star-history charts. This action brings
them back: inside a workflow, the automatic `GITHUB_TOKEN` still has access,
so the action fetches the star history, renders a shadcn-styled SVG chart via
`@shieldcn/core`, and commits it to the repo as `shieldcn[bot]`.

- `mode: both` (default) writes a dark/light pair with a ready-to-paste
  `<picture>` snippet output
- Full shieldcn chart styling: `theme`, `color`, `background`, `border`,
  `area`, `font`, `width`, `height`, `title`, `subtitle`
- Exact curves for repos under ~3k stars, evenly sampled pages (starcharts
  strategy) up to GitHub's 40k-star pagination cap
