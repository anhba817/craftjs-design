// Phase 22 Group B/C — the screenshot + exact-contrast path. Gated on
// Playwright being installed AND the harness built (dist-lib/harness): these
// are heavy/optional, so the suite skips cleanly in environments without a
// browser instead of failing.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildDocument } from '@/headless/build'
import {
  createImageRenderer,
  isRenderImageAvailable,
  type ImageRenderer,
} from './renderImage'

await import('@/registry/components') // node-side registry for buildDocument

// Gate on the SAME check the server uses: Playwright package + an actually-
// installed browser binary + the built harness. In CI the package is present
// but the browser isn't (`playwright install` not run), so this is false and
// the heavy suite skips cleanly instead of failing on launch.
const available = await isRenderImageAvailable()
const runIf = available ? describe : describe.skip

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47] // ‰PNG

const doc = () =>
  buildDocument({
    root: {
      canonical: 'box',
      style: { classes: { root: 'p-8 flex flex-col gap-4 bg-background' } },
      children: [
        { canonical: 'heading', nodeProps: { content: 'Pricing' } },
        {
          canonical: 'text',
          nodeProps: { content: 'Barely visible' },
          // Deliberately low contrast: light-gray text on white.
          style: { classes: { root: 'text-gray-300' } },
        },
        { canonical: 'button', nodeProps: { label: 'Buy' } },
      ],
    },
    adapterId: 'shadcn',
  })

runIf('createImageRenderer (real chromium)', () => {
  let renderer: ImageRenderer
  beforeAll(async () => {
    renderer = await createImageRenderer()
  }, 60_000)
  afterAll(async () => {
    await renderer?.close()
  })

  it('renders a document to a real PNG (and actually mounts it — no error boundary)', async () => {
    const png = await renderer.render(doc(), { width: 800 })
    expect(png.length).toBeGreaterThan(1000)
    expect([...png.slice(0, 4)]).toEqual(PNG_MAGIC)
    // A render that fell back to the error boundary would have zero craft
    // nodes; checkContrast finding nodes proves the document truly mounted.
    expect((await renderer.checkContrast(doc())).length).toBeGreaterThan(0)
  })

  it('a non-empty document renders larger than a near-empty one', async () => {
    const empty = await renderer.render(buildDocument({ root: { canonical: 'box' } }))
    const full = await renderer.render(doc())
    expect(full.length).toBeGreaterThan(empty.length)
  })

  it('reuses one browser across renders (warm renderer)', async () => {
    // Two renders in a row succeed without relaunching (no throw).
    await renderer.render(doc(), { width: 400 })
    const png = await renderer.render(doc(), { width: 600 })
    expect([...png.slice(0, 4)]).toEqual(PNG_MAGIC)
  })

  it('computes exact per-node contrast and ranks the low-contrast node worst', async () => {
    const results = await renderer.checkContrast(doc())
    expect(results.length).toBeGreaterThan(0)
    // Worst-first: the gray-on-white text node should be near the top with a
    // low ratio + Fail grade.
    const worst = results[0]
    expect(worst.ratio).toBeLessThan(4.5)
    expect(['Fail', 'AA Large']).toContain(worst.grade)
    // The heading (foreground on background) should grade strongly somewhere.
    expect(results.some((r) => r.ratio > 7)).toBe(true)
  })
})

describe('renderImage availability', () => {
  it('isRenderImageAvailable() is a boolean (gates the heavy suite above)', () => {
    // Informational — surfaces whether the browser path was exercised. When
    // false (e.g. CI without `playwright install`), the suite above skips.
    expect(typeof available).toBe('boolean')
  })
})
