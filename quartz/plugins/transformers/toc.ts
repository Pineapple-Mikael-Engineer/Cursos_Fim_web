import { QuartzTransformerPlugin } from "../types"
import { Root } from "mdast"
import { visit } from "unist-util-visit"
import { toString } from "mdast-util-to-string"
import Slugger from "github-slugger"
import katex from "katex"

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export interface Options {
  maxDepth: 1 | 2 | 3 | 4 | 5 | 6
  minEntries: number
  showByDefault: boolean
  collapseByDefault: boolean
}

const defaultOptions: Options = {
  maxDepth: 3,
  minEntries: 1,
  showByDefault: true,
  collapseByDefault: false,
}

interface TocEntry {
  depth: number
  text: string
  slug: string // this is just the anchor (#some-slug), not the canonical slug
}

const slugAnchor = new Slugger()
export const TableOfContents: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  return {
    name: "TableOfContents",
    markdownPlugins() {
      return [
        () => {
          return async (tree: Root, file) => {
            const display = file.data.frontmatter?.enableToc ?? opts.showByDefault
            if (display) {
              slugAnchor.reset()
              const toc: TocEntry[] = []
              let highestDepth: number = opts.maxDepth
              visit(tree, "heading", (node) => {
                if (node.depth <= opts.maxDepth) {
                  // Texto para el slug/ancla: sin delimitadores (como siempre,
                  // para no romper los enlaces #anchor existentes).
                  const slugText = toString(node)

                  // Texto para mostrar: HTML con el math ya renderizado por
                  // KaTeX en el build (remark-math parsea en el parser, así que
                  // aquí ya tenemos nodos inlineMath/math). Esto evita depender
                  // de render en cliente y no hay parpadeo de "$...$".
                  let displayHtml = ""
                  visit(node, (child) => {
                    const c = child as any
                    if (c.type === "inlineMath" || c.type === "math") {
                      try {
                        displayHtml += katex.renderToString(c.value, {
                          displayMode: c.type === "math",
                          throwOnError: false,
                          output: "html",
                        })
                      } catch {
                        displayHtml += escapeHtml(c.value)
                      }
                    } else if (c.type === "text" || c.type === "inlineCode") {
                      displayHtml += escapeHtml(c.value)
                    }
                  })
                  if (displayHtml.trim().length === 0) {
                    displayHtml = escapeHtml(slugText)
                  }

                  highestDepth = Math.min(highestDepth, node.depth)
                  toc.push({
                    depth: node.depth,
                    // 'text' es HTML seguro (texto escapado + KaTeX renderizado)
                    text: displayHtml,
                    slug: slugAnchor.slug(slugText),
                  })
                }
              })

              if (toc.length > 0 && toc.length > opts.minEntries) {
                file.data.toc = toc.map((entry) => ({
                  ...entry,
                  depth: entry.depth - highestDepth,
                }))
                file.data.collapseToc = opts.collapseByDefault
              }
            }
          }
        },
      ]
    },
  }
}

declare module "vfile" {
  interface DataMap {
    toc: TocEntry[]
    collapseToc: boolean
  }
}
