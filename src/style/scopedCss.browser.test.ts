// Phase 24 Group C — THE make-or-break test for the scoped stylesheet.
//
// Loads the BUILT `dist-lib/index.scoped.css` into a real browser alongside a
// fake Tailwind-v4 host (its own `:root` token + no box-sizing reset) and
// asserts, via getComputedStyle, the three claims the scoped sheet exists to
// make:
//   (a) the host's `:root` custom property is NOT clobbered;
//   (b) the editor's preflight reset applies ONLY inside `.crafted-design-scope`
//       (the host page isn't double-reset);
//   (c) a `.crafted-design-scope` subtree — including a body-level container
//       like the runtime overlay portal root (Group A) — resolves the editor's
//       OWN tokens.
//
// Gated on Playwright + a Chromium binary + the built sheet (heavy/optional, so
// it skips cleanly where those are absent — same model as renderImage.test.ts).
// jsdom can't do this: it doesn't apply stylesheet cascade to getComputedStyle.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const SCOPED_CSS_PATH = resolve(__dirname, '../../dist-lib/index.scoped.css')

async function available(): Promise<boolean> {
  if (!existsSync(SCOPED_CSS_PATH)) return false
  try {
    const { chromium } = await import('playwright')
    const exe = chromium.executablePath()
    return !!exe && existsSync(exe)
  } catch {
    return false
  }
}

const runIf = (await available()) ? describe : describe.skip

// A host page that mimics a Tailwind-v4 app: its own `:root` token + a host
// margin, and crucially NO box-sizing reset of its own, so we can tell whether
// the editor's `* { box-sizing: border-box }` preflight leaks past the scope.
const HOST_PRIMARY = 'rgb(11, 22, 33)'

function pageHtml(scopedCss: string): string {
  return `<!doctype html><html><head>
    <style>:root { --color-primary: ${HOST_PRIMARY}; } body { margin: 40px; }</style>
    <style>${scopedCss}</style>
  </head><body>
    <p id="outside">host content outside the editor</p>
    <div class="crafted-design-scope" id="scope">
      <p id="inside">editor content</p>
    </div>
    <!-- mimics the body-level overlay portal root (getScopedPortalRoot) -->
    <div class="crafted-design-scope" id="portal"><p id="portal-child">x</p></div>
  </body></html>`
}

runIf('scoped stylesheet against a Tailwind-v4 host (real browser)', () => {
  let browser: import('playwright').Browser
  let read: (sel: string, prop: string) => Promise<string>

  beforeAll(async () => {
    const { chromium } = await import('playwright')
    browser = await chromium.launch({ args: ['--no-sandbox'] })
    const page = await browser.newPage()
    const scopedCss = readFileSync(SCOPED_CSS_PATH, 'utf8')
    await page.setContent(pageHtml(scopedCss), { waitUntil: 'load' })
    read = (sel, prop) =>
      page.evaluate(
        ([s, p]) => {
          const el = document.querySelector(s)!
          return getComputedStyle(el).getPropertyValue(p).trim()
        },
        [sel, prop] as const,
      )
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
  })

  it('(a) does NOT clobber the host’s :root token', async () => {
    expect(await read(':root', '--color-primary')).toBe(HOST_PRIMARY)
  })

  it('(c) rehomes the editor’s tokens onto .crafted-design-scope (≠ host)', async () => {
    const scopePrimary = await read('#scope', '--color-primary')
    expect(scopePrimary).not.toBe('')
    expect(scopePrimary).not.toBe(HOST_PRIMARY)
  })

  it('(b) scopes the preflight reset — border-box inside, untouched outside', async () => {
    expect(await read('#inside', 'box-sizing')).toBe('border-box')
    // The host element outside the scope keeps the UA default (no double reset).
    expect(await read('#outside', 'box-sizing')).toBe('content-box')
  })

  it('(c) a body-level portal-root container also gets the editor tokens', async () => {
    const portalPrimary = await read('#portal', '--color-primary')
    const scopePrimary = await read('#scope', '--color-primary')
    expect(portalPrimary).toBe(scopePrimary)
    expect(portalPrimary).not.toBe(HOST_PRIMARY)
  })
})
