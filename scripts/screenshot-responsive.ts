import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

// Phase 25 (Group D) — capture the editor chrome at the responsive breakpoints
// (375 / 768 / 1024 / 1440) so the layout can be eyeballed. Serves the built
// demo (dist-demo, `npm run build:demo`) over loopback HTTP and screenshots it
// with Playwright. A dev/verification tool, not a CI gate. Gated on
// Playwright + Chromium + the built demo (skips cleanly otherwise).

const DIST = resolve(import.meta.dirname, '..', 'dist-demo')
const OUT = resolve(import.meta.dirname, '..', 'responsive-shots')
const WIDTHS = [375, 768, 1024, 1440]

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
}

async function main() {
  if (!existsSync(join(DIST, 'demo.html'))) {
    console.error('screenshot:responsive — dist-demo/demo.html missing. Run `npm run build:demo` first.')
    process.exit(1)
  }
  let chromium: typeof import('playwright').chromium
  try {
    ;({ chromium } = await import('playwright'))
    const exe = chromium.executablePath()
    if (!exe || !existsSync(exe)) throw new Error('no chromium binary')
  } catch {
    console.error('screenshot:responsive — Playwright/Chromium not available; skipping.')
    process.exit(0)
  }

  const server = createServer((req, res) => {
    let path = (req.url ?? '/').split('?')[0]
    if (path === '/' || path === '') path = '/demo.html'
    const file = join(DIST, path)
    if (!file.startsWith(DIST) || !existsSync(file)) {
      res.statusCode = 404
      res.end('not found')
      return
    }
    res.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream')
    res.end(readFileSync(file))
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const addr = server.address()
  const port = typeof addr === 'object' && addr ? addr.port : 0
  const url = `http://127.0.0.1:${port}/demo.html`

  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 820 } })
    // Suppress the first-load onboarding tour — its modal backdrop would
    // intercept the `⋯` click below.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('craftjs-design.onboarding-completed:v1', '1')
      } catch {
        /* ignore */
      }
    })
    await page.goto(url, { waitUntil: 'networkidle' })
    // Wait for the editor canvas to mount.
    await page.waitForSelector('[data-onboarding-target="canvas"]', { timeout: 15_000 })
    await page.waitForTimeout(400)
    const out = join(OUT, `editor-${width}.png`)
    await page.screenshot({ path: out })
    console.log(`screenshot:responsive — ${width}px → ${out}`)

    // If the toolbar is condensed (< xl), also open the `⋯` overflow popover
    // and capture it — so the popover layout (no control overflow) is verified.
    const more = await page.$('[aria-label="More actions"]')
    if (more) {
      await more.click()
      await page.waitForTimeout(300)
      const outMenu = join(OUT, `editor-${width}-overflow.png`)
      await page.screenshot({ path: outMenu })
      console.log(`screenshot:responsive — ${width}px overflow → ${outMenu}`)
    }
    await page.close()
  }
  await browser.close()
  server.close()
}

void main()
