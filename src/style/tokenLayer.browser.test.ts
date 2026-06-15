// CSS-isolation fix — the global index.css ships its document tokens in a
// cascade layer (@layer crafted-design), so importing it never clobbers a
// host's own :root tokens. Loads the BUILT dist-lib/index.css into a real
// browser and checks the cascade via getComputedStyle.
//
// Gated on Playwright + Chromium + the built sheet (skips cleanly otherwise),
// like scopedCss.browser.test.ts — jsdom can't resolve @layer cascade.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const CSS_PATH = resolve(__dirname, '../../dist-lib/index.css')

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

const HOST_PRIMARY = 'rgb(10, 20, 30)'

runIf('global index.css layers its document tokens (real browser)', () => {
  let browser: import('playwright').Browser
  let editorCss: string

  beforeAll(async () => {
    const { chromium } = await import('playwright')
    browser = await chromium.launch({ args: ['--no-sandbox'] })
    editorCss = readFileSync(CSS_PATH, 'utf8')
  }, 60_000)
  afterAll(async () => {
    await browser?.close()
  })

  async function read(html: string, prop: string, selector = ':root') {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const v = await page.evaluate(
      ([s, p]) =>
        getComputedStyle(document.querySelector(s)!)
          .getPropertyValue(p)
          .trim(),
      [selector, prop] as const,
    )
    await page.close()
    return v
  }

  it('a host’s unlayered :root --primary WINS even when the editor CSS loads last', async () => {
    // Host token first, editor CSS last (the original clobber scenario). The
    // layer makes the unlayered host rule win regardless of order.
    const html = `<!doctype html><html><head>
      <style>:root { --primary: ${HOST_PRIMARY}; }</style>
      <style>${editorCss}</style>
    </head><body></body></html>`
    expect(await read(html, '--primary')).toBe(HOST_PRIMARY)
  })

  it('still applies the editor’s document token when the host sets none (standalone)', async () => {
    const html = `<!doctype html><html><head><style>${editorCss}</style></head><body></body></html>`
    const primary = await read(html, '--primary')
    expect(primary).not.toBe('')
    expect(primary).not.toBe(HOST_PRIMARY) // the editor's own neutral default
  })

  it('keeps the editor’s --ed-* chrome tokens (unlayered — a host can’t clobber them)', async () => {
    const html = `<!doctype html><html><head>
      <style>:root { --primary: ${HOST_PRIMARY}; }</style>
      <style>${editorCss}</style>
    </head><body></body></html>`
    const edSurface = await read(html, '--ed-surface')
    expect(edSurface).not.toBe('')
  })
})
