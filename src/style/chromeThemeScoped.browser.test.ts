// Phase 24 follow-up — the scoped stylesheet must NOT clobber the host's chrome
// theme. `editorTheme` applies `--ed-*` vars + data-editor-theme INLINE on
// <html>; the scoped sheet keeps the `--ed-*` chrome rules GLOBAL (not rehomed
// onto .crafted-design-scope) so those inline vars still cascade in — while the
// DOCUMENT tokens stay scoped. Verified in a real browser (jsdom can't resolve
// the cascade). Gated on Playwright + the built sheet.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const CSS_PATH = resolve(__dirname, '../../dist-lib/index.scoped.css')

async function available(): Promise<boolean> {
  if (!existsSync(CSS_PATH)) return false
  try {
    const { chromium } = await import('playwright')
    const exe = chromium.executablePath()
    return !!exe && existsSync(exe)
  } catch {
    return false
  }
}

const runIf = (await available()) ? describe : describe.skip
const ED_DARK = 'rgb(7, 8, 9)'

runIf('scoped sheet keeps the chrome theme host-configurable (real browser)', () => {
  let browser: import('playwright').Browser
  let scoped: string

  beforeAll(async () => {
    const { chromium } = await import('playwright')
    browser = await chromium.launch({ args: ['--no-sandbox'] })
    scoped = readFileSync(CSS_PATH, 'utf8')
  }, 60_000)
  afterAll(async () => {
    await browser?.close()
  })

  async function read(prop: string, selector: string) {
    const page = await browser.newPage()
    // Host applied editorTheme="dark": data-editor-theme + an inline --ed-* var
    // on <html> (exactly what <Editor editorTheme> does).
    await page.setContent(
      `<!doctype html><html data-editor-theme="dark" style="--ed-surface: ${ED_DARK}">
        <head><style>${scoped}</style></head>
        <body><div class="crafted-design-scope">
          <div class="cd-editor-chrome" id="chrome">x</div>
        </div></body></html>`,
      { waitUntil: 'load' },
    )
    const v = await page.evaluate(
      ([s, p]) => getComputedStyle(document.querySelector(s)!).getPropertyValue(p).trim(),
      [selector, prop] as const,
    )
    await page.close()
    return v
  }

  it('the host’s inline --ed-* (editorTheme) reaches the editor chrome', async () => {
    expect(await read('--ed-surface', '#chrome')).toBe(ED_DARK)
  })

  it('document tokens stay scoped to the editor (not clobbered by, nor clobbering, the chrome path)', async () => {
    // --primary is rehomed onto .crafted-design-scope (the editor's own value),
    // independent of the chrome theme.
    expect(await read('--primary', '.crafted-design-scope')).not.toBe('')
  })
})
