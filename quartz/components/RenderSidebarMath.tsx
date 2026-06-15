import { QuartzComponent, QuartzComponentConstructor } from "./types"

// Dos ajustes de math en cliente:
// (1) Renderiza KaTeX en los sidebars (TOC / Explorer / Backlinks). El TOC se
//     construye a partir de texto (con "$...$"), no del HTML ya renderizado.
// (2) Da scroll horizontal SOLO al math inline que desborda su contenedor
//     (antes se salía hacia el grafo). El math corto queda intacto para no
//     alterar su alineación vertical.
const script = `
(() => {
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return }
      const s = document.createElement("script")
      s.src = src
      s.crossOrigin = "anonymous"
      s.onload = () => resolve()
      s.onerror = reject
      document.head.appendChild(s)
    })
  }

  async function renderSidebarMath() {
    const targets = Array.from(document.querySelectorAll(".toc, .explorer, .backlinks"))
    if (targets.length === 0) return
    const hasMath = targets.some((el) => (el.textContent || "").includes("$"))
    if (!hasMath) return
    try {
      if (typeof window.renderMathInElement === "undefined") {
        if (typeof window.katex === "undefined") {
          await loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js")
        }
        await loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js")
      }
      for (const el of targets) {
        window.renderMathInElement(el, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
          ],
          throwOnError: false,
          ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        })
      }
    } catch (e) {
      console.error("[math] no se pudo renderizar el math del sidebar:", e)
    }
  }

  // Ancho útil del bloque que contiene a la fórmula (subiendo por padres inline)
  function blockWidth(el) {
    let b = el.parentElement
    while (b && getComputedStyle(b).display.indexOf("inline") === 0) {
      b = b.parentElement
    }
    return b ? b.clientWidth : 0
  }

  // Da scroll horizontal a las fórmulas inline que desbordan su contenedor,
  // dentro del 'root' indicado (cuerpo o cualquier sidebar).
  function fixWideMath(root) {
    if (!root) return
    root.querySelectorAll(".katex").forEach((el) => {
      if (el.closest(".katex-display")) return // el display math ya scrollea por CSS
      if (el.dataset.mathScroll === "1") return
      const avail = blockWidth(el)
      const w = el.getBoundingClientRect().width
      if (avail > 0 && w > avail + 2) {
        el.style.display = "inline-block"
        el.style.maxWidth = "100%"
        el.style.overflowX = "auto"
        el.style.overflowY = "hidden"
        el.style.verticalAlign = "middle"
        el.dataset.mathScroll = "1"
      }
    })
  }

  function fixSidebars() {
    document
      .querySelectorAll(".toc, .explorer, .backlinks")
      .forEach((c) => fixWideMath(c))
  }

  async function run() {
    // El math del cuerpo ya está renderizado por el servidor
    fixWideMath(document.querySelector("article"))
    // El del sidebar se renderiza en cliente: medimos DESPUÉS de renderizarlo
    await renderSidebarMath()
    fixSidebars()
  }

  document.addEventListener("nav", () => { run() })
  let resizeTimer
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      fixWideMath(document.querySelector("article"))
      fixSidebars()
    }, 150)
  })
  if (document.readyState !== "loading") {
    run()
  } else {
    document.addEventListener("DOMContentLoaded", () => run())
  }
})()
`

const RenderSidebarMath: QuartzComponent = () => null

RenderSidebarMath.afterDOMLoaded = script

export default (() => RenderSidebarMath) satisfies QuartzComponentConstructor
