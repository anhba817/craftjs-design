// Phase 22 Groups B+C — screenshot + exact contrast via a PERSISTENT headless
// page that mounts our own <DocumentRenderer> (the render harness). Mirrors how
// design tools export from the renderer they own: launch a browser once, open
// one harness page, then per request push the envelope in and screenshot /
// read computed styles. Playwright is an OPTIONAL peer — lazy-imported here so
// nothing else in the package depends on it.
import { createServer, type Server } from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, extname, normalize, resolve } from 'node:path'
import type { AddressInfo } from 'node:net'
import type { Browser, Page } from 'playwright'
import { contrastGrade, contrastRatio } from '@/editor/inspector/shared/contrast'
import { parseColor } from '@/headless/contrast'
import type { EditorDocument } from '@/persistence/schema'

export class MissingBrowserError extends Error {
  constructor() {
    super(
      'Playwright is not installed. Run `npm i -D playwright && npx playwright install chromium` to enable render_image / browser-accurate check_contrast.',
    )
    this.name = 'MissingBrowserError'
  }
}

export class MissingHarnessError extends Error {
  constructor() {
    super(
      'render harness not found — the package was built without it (run `npm run build:harness`).',
    )
    this.name = 'MissingHarnessError'
  }
}

// Find the dist-lib/harness directory relative to this module. When bundled
// this module lives at dist-lib/<chunk>.js (harness is a sibling `harness/`);
// in dev (tsx, src/mcp/) it's at ../../dist-lib/harness.
function locateHarnessDir(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  for (const rel of ['./harness', '../dist-lib/harness', '../../dist-lib/harness']) {
    const p = resolve(here, rel)
    if (existsSync(resolve(p, 'harness.html'))) return p
  }
  throw new MissingHarnessError()
}

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
}

// ES module scripts are CORS-blocked over file:// (origin 'null'), so serve the
// built harness over loopback HTTP. Path traversal is contained to the dir.
function serveHarness(dir: string): Promise<{ server: Server; origin: string }> {
  return new Promise((resolveP) => {
    const server = createServer((req, res) => {
      const reqPath = decodeURIComponent((req.url ?? '/').split('?')[0])
      const rel = reqPath === '/' ? 'harness.html' : reqPath.replace(/^\/+/, '')
      const file = resolve(dir, rel)
      if (!normalize(file).startsWith(normalize(dir)) || !existsSync(file)) {
        res.statusCode = 404
        res.end('not found')
        return
      }
      res.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream')
      createReadStream(file).pipe(res)
    })
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port
      resolveP({ server, origin: `http://127.0.0.1:${port}` })
    })
  })
}

/**
 * True when render_image / browser-exact check_contrast CAN run — Playwright
 * is importable and the harness was built — WITHOUT launching a browser. The
 * server uses this to decide whether to expose render_image and to prescribe
 * it in get_capabilities, so the agent only ever sees a tool that works.
 */
export async function isRenderImageAvailable(): Promise<boolean> {
  try {
    await import('playwright')
  } catch {
    return false
  }
  try {
    locateHarnessDir()
    return true
  } catch {
    return false
  }
}

export interface RenderOptions {
  adapterId?: string
  /** Viewport width in px (height auto-grows to content). Default 1280. */
  width?: number
  /** Device scale factor for the screenshot. Default 1. */
  scale?: number
}

export interface NodeContrastExact {
  nodeId: string
  fg: string
  bg: string
  ratio: number
  grade: string
}

const MAX_WIDTH = 2400

/**
 * A warm renderer: launches chromium + opens the harness once, then renders
 * documents on demand. Reused for the server's lifetime; `close()` on shutdown.
 */
export interface ImageRenderer {
  render(doc: EditorDocument, opts?: RenderOptions): Promise<Uint8Array>
  checkContrast(doc: EditorDocument): Promise<NodeContrastExact[]>
  close(): Promise<void>
}

export async function createImageRenderer(): Promise<ImageRenderer> {
  let chromium: typeof import('playwright').chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    throw new MissingBrowserError()
  }
  const { server, origin } = await serveHarness(locateHarnessDir())

  let browser: Browser | null = null
  let page: Page | null = null

  async function ensurePage(width: number): Promise<Page> {
    if (!browser || !browser.isConnected()) {
      browser = await chromium.launch({ args: ['--no-sandbox'] })
      page = null
    }
    if (!page || page.isClosed()) {
      page = await browser.newPage()
      // Offline: only the loopback harness origin is allowed; anything else
      // (web fonts, CDNs) is blocked so the render is hermetic.
      await page.route('**/*', (route) => {
        route[route.request().url().startsWith(origin) ? 'continue' : 'abort']()
      })
      await page.goto(`${origin}/harness.html`)
      await page.waitForFunction('window.__ready === true')
    }
    await page.setViewportSize({ width, height: 800 })
    return page
  }

  async function load(doc: EditorDocument, width: number): Promise<Page> {
    const p = await ensurePage(width)
    await p.evaluate(
      ([json, adapterId]) => window.__render(json, adapterId || undefined),
      [JSON.stringify(doc), doc.adapterId] as const,
    )
    return p
  }

  return {
    async render(doc, opts = {}) {
      const width = Math.min(Math.max(opts.width ?? 1280, 200), MAX_WIDTH)
      const p = await load({ ...doc, adapterId: opts.adapterId ?? doc.adapterId }, width)
      const buf = await p.screenshot({
        fullPage: true,
        type: 'png',
        scale: 'device',
      })
      return new Uint8Array(buf)
    },

    async checkContrast(doc) {
      const p = await load(doc, 1280)
      // Read computed colors for every element carrying a craft node id.
      const raw = await p.evaluate(() => {
        // A computed background is transparent only when it's `transparent`
        // or an explicit zero-alpha rgba(); anything else (incl. opaque
        // oklch()) is a real backdrop to stop the walk on.
        const isTransparent = (c: string): boolean => {
          if (c === 'transparent' || c === '') return true
          const m = /rgba?\([^)]*[\s,/]\s*0(?:\.0+)?\s*\)$/.exec(c)
          return m !== null
        }
        const out: { nodeId: string; fg: string; bg: string }[] = []
        for (const el of Array.from(
          document.querySelectorAll<HTMLElement>('[data-craft-node-id]'),
        )) {
          if (!el.textContent?.trim()) continue
          const fg = getComputedStyle(el).color
          let bgEl: HTMLElement | null = el
          let bg = 'rgb(255, 255, 255)' // assume white page if nothing opaque found
          while (bgEl) {
            const c = getComputedStyle(bgEl).backgroundColor
            if (!isTransparent(c)) {
              bg = c
              break
            }
            bgEl = bgEl.parentElement
          }
          out.push({ nodeId: el.dataset.craftNodeId!, fg, bg })
        }
        return out
      })
      // Chrome returns computed colors for oklch-defined tokens AS oklch(…),
      // so parse with the oklch-aware parser (not a plain rgb regex).
      const results: NodeContrastExact[] = []
      for (const r of raw) {
        const fg = parseColor(r.fg)
        const bg = parseColor(r.bg)
        if (!fg || !bg) continue
        const ratio = contrastRatio(fg, bg)
        results.push({
          nodeId: r.nodeId,
          fg: r.fg,
          bg: r.bg,
          ratio: Math.round(ratio * 100) / 100,
          grade: contrastGrade(ratio),
        })
      }
      return results.sort((a, b) => a.ratio - b.ratio)
    },

    async close() {
      await browser?.close().catch(() => {})
      browser = null
      page = null
      await new Promise<void>((r) => server.close(() => r()))
    },
  }
}
