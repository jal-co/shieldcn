/**
 * shieldcn
 * scripts/tegami
 *
 * Release pipeline config (changelogs, versioning, GitHub releases).
 * All packages are private — tegami versions them and opens Version Packages
 * PRs, but nothing is published to npm. The starchart action's moving `v1`
 * tag is handled by .github/workflows/release.yml after the version PR merges.
 */

import { tegami } from "tegami"
import { runCli } from "tegami/cli"
import { github } from "tegami/plugins/github"

const paper = tegami({
  plugins: [
    github({
      repo: "jal-co/shieldcn",
      versionPr: {
        base: "main",
      },
    }),
  ],
})

await runCli(paper)
