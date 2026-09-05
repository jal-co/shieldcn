## @shieldcn/action@1.1.0

### Privacy-safe star history and chart pull requests

Fetch complete weekly star history with GitHub's new privacy-safe endpoint.
The Action and hosted charts now share the same cumulative series builder.

Set `pull-request: true` to open or update a chart PR instead of pushing to a
protected default branch. PR mode commits only generated chart files and
returns the PR URL through `pull-request-url`. It requires `contents: write`
and `pull-requests: write`. Direct commits remain the default, and
`commit: false` still writes files without publishing them.

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
