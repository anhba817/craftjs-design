// Phase 27 Group C — runtime proof that the SYNC headless renderer emits real
// icon SVGs (the lazy DynamicIcon default can't, since effects don't run under
// renderToStaticMarkup). Node env (no DOM), exactly like a server / MCP render.
import { beforeAll, describe, expect, it } from 'vitest'
import { buildDocument } from './build'
import { renderDocumentToHtml } from './render'

beforeAll(async () => {
  await import('@/registry/components')
  await import('@/adapters/html')
})

const iconDoc = (name: string) =>
  buildDocument({
    root: {
      canonical: 'box',
      children: [{ canonical: 'icon', nodeProps: { name, size: 'base' } }],
    },
    adapterId: 'html',
  })

describe('headless icon rendering (sync, real glyphs)', () => {
  it('renders a NON-legacy glyph (shopping-cart) — impossible under the old enum', () => {
    const html = renderDocumentToHtml(iconDoc('shopping-cart'))
    expect(html).toContain('<svg')
    // shopping-cart has wheel <circle>s — proves the real glyph rendered, not
    // the fallback Square (a <rect>) and not a blank effect-only DynamicIcon.
    expect(html).toContain('<circle')
    expect(html).not.toContain('<rect')
  })

  it('renders a legacy glyph (alert-circle, a lucide alias) — backward compatible', () => {
    const html = renderDocumentToHtml(iconDoc('alert-circle'))
    expect(html).toContain('<svg')
    expect(html).toContain('<circle') // alert-circle is a ringed glyph
  })

  it('unknown name → fallback Square (<rect>), never blank/throwing', () => {
    const html = renderDocumentToHtml(iconDoc('definitely-not-an-icon'))
    expect(html).toContain('<svg')
    expect(html).toContain('<rect')
    expect(html).not.toContain('<circle')
  })
})
