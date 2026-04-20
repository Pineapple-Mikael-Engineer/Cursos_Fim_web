import { ComponentChildren } from "preact"
import { htmlToJsx } from "../../util/jsx"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const Content: QuartzComponent = ({ fileData, tree }: QuartzComponentProps) => {
  const content = htmlToJsx(fileData.filePath!, tree) as ComponentChildren
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = [
    "popover-hint",
    "markdown-preview-view",
    "markdown-rendered",
    ...classes,
  ].join(" ")
  return (
    <article class={classString}>
      <div class="markdown-preview-sizer">{content}</div>
    </article>
  )
}

export default (() => Content) satisfies QuartzComponentConstructor
