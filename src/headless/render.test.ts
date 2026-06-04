// Phase 21 Group B — headless static render. Deliberately runs in the NODE
// environment (no jsdom): renderDocumentToHtml must work in a server / MCP
// process with no DOM at all.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildDocument } from './build'
import { outlineDocument, renderDocumentToHtml } from './render'

beforeAll(async () => {
  await import('@/registry/components')
  await import('@/themes')
  await import('@/adapters/html')
})

const doc = () =>
  buildDocument({
    root: {
      canonical: 'box',
      style: { classes: { root: 'p-8 flex flex-col gap-4' } },
      children: [
        { canonical: 'heading', nodeProps: { content: 'Pricing' } },
        {
          canonical: 'card',
          slots: {
            header: [{ canonical: 'heading', nodeProps: { content: 'Pro plan' } }],
            body: [{ canonical: 'text', nodeProps: { content: 'Everything included.' } }],
          },
        },
        { canonical: 'button', nodeProps: { label: 'Buy now' } },
        { canonical: 'table' },
        { canonical: 'modal' },
      ],
    },
    adapterId: 'html',
    themeId: 'rose',
  })

describe('renderDocumentToHtml', () => {
  it('renders a Pattern A + B document to static HTML with no DOM', () => {
    const html = renderDocumentToHtml(doc())
    expect(html).toContain('Pricing')
    expect(html).toContain('Pro plan')
    expect(html).toContain('Everything included.')
    expect(html).toContain('Buy now')
    // The root's authored Tailwind classes are carried through.
    expect(html).toContain('p-8 flex flex-col gap-4')
    // Theme wrapper from the envelope.
    expect(html).toContain('data-theme="rose"')
    // Table renders real table structure via the html adapter.
    expect(html).toContain('<table')
    expect(html).toMatch(/<td/)
  })

  it('overlays render their runtime closed state (nothing inline)', () => {
    const html = renderDocumentToHtml(doc())
    // The modal contributes no dialog content to the static page.
    expect(html).not.toContain('role="dialog"')
  })

  it('accepts the JSON-string form and an adapter override', () => {
    const asString = JSON.stringify(doc())
    const html = renderDocumentToHtml(asString, { adapterId: 'html' })
    expect(html).toContain('Buy now')
  })

  it('throws a registration hint for unknown adapters', () => {
    expect(() => renderDocumentToHtml(doc(), { adapterId: 'mui' })).toThrow(
      /not registered — import it first/,
    )
  })

  it("renders the repo's real exported document fixture", () => {
    const json = readFileSync(
      resolve(import.meta.dirname, '../../examples/renderer-host/src/document.json'),
      'utf8',
    )
    const html = renderDocumentToHtml(json, { adapterId: 'html' })
    expect(html).toContain('placehold.co/600x100') // the active (image) slide
    // Carousel renders its runtime state: ONE slide visible + dot nav. The
    // table lives on an inactive slide, so it's correctly absent here.
    expect(html).toContain('aria-roledescription="carousel"')
    expect(html).toContain('aria-label="Go to slide 3"')
    expect(html.length).toBeGreaterThan(1000)
  })
})

describe('outlineDocument', () => {
  it('produces an indented id · canonical tree with slot labels', () => {
    const outline = outlineDocument(doc())
    expect(outline).toContain('ROOT · box')
    expect(outline).toContain('heading-1 · heading "Pricing"')
    expect(outline).toMatch(/\[header\] heading-2 · heading "Pro plan"/)
    expect(outline).toMatch(/\[footer\] \(empty\)/)
    expect(outline).toContain('button-1 · button "Buy now"')
    // Table's slotComponent cells appear under their slot keys.
    expect(outline).toMatch(/\[cell-r0-c0\]/)
  })
})
