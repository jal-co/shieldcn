import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const eslintConfig = [
  {
    ignores: [
      ".next/",
      ".source/",
      "next-env.d.ts",
      // Vendored bklit-ui chart primitives (installed from the @bklit shadcn
      // registry). Third-party generated code authored for a biome lint
      // config — not linted here so registry updates stay drop-in.
      "components/charts/**",
      "components/shimmering-text.tsx",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
]

export default eslintConfig
