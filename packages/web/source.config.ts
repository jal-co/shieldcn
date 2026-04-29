import { defineDocs, defineConfig, frontmatterSchema } from "fumadocs-mdx/config"

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.passthrough(),
  },
})

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: "min-light",
        dark: "vesper",
      },
    },
  },
})
