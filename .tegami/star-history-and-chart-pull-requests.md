---
packages:
  "@shieldcn/action":
    type: minor
---

# Privacy-safe star history and chart pull requests

Fetch complete weekly star history with GitHub's new privacy-safe endpoint.
The Action and hosted charts now share the same cumulative series builder.

Set `pull-request: true` to open or update a chart PR instead of pushing to a
protected default branch. PR mode commits only generated chart files and
returns the PR URL through `pull-request-url`. It requires `contents: write`
and `pull-requests: write`. Direct commits remain the default, and
`commit: false` still writes files without publishing them.
