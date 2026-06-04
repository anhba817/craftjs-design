import { beforeAll, describe, expect, it } from 'vitest'
import { deriveTokens } from '@/themes/tokens'
import { buildDocument } from './build'
import {
  analyzeDocumentContrast,
  analyzeThemeContrast,
  parseColor,
  resolveThemePalette,
} from './contrast'

beforeAll(async () => {
  await import('@/registry/components')
  await import('@/themes')
})

describe('parseColor', () => {
  it('parses oklch, hex, and rgb to sRGB', () => {
    expect(parseColor('oklch(1 0 0)')).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseColor('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 })
    expect(parseColor('not-a-color')).toBeNull()
  })
})

describe('resolveThemePalette — default theme matches index.css base', () => {
  it("light: the 'default' theme resolves the shadcn neutral palette", () => {
    const p = resolveThemePalette('default', 'light')
    // background white, foreground near-black (index.css :root).
    expect(p.background).toEqual({ r: 255, g: 255, b: 255 })
    expect(p['primary-foreground'].r).toBeGreaterThan(245) // oklch(0.985) ≈ near-white
    // foreground is very dark.
    expect(p.foreground.r).toBeLessThan(40)
  })
  it("dark: the 'default' theme inverts", () => {
    const p = resolveThemePalette('default', 'dark')
    expect(p.background.r).toBeLessThan(60) // near-black bg
    expect(p.foreground.r).toBeGreaterThan(230) // near-white text
  })
  it('the default base map agrees with deriveTokens (anti-drift)', () => {
    // The DEFAULT_LIGHT base must produce index.css's :root values.
    const d = deriveTokens({ primary: 'oklch(0.205 0 0)' }, 'light')
    expect(d.background).toBe('oklch(1 0 0)')
    expect(d['primary-foreground']).toBe('oklch(0.985 0 0)')
  })
})

describe('analyzeThemeContrast', () => {
  it('default theme: body text easily clears AAA', () => {
    const report = analyzeThemeContrast('default', 'light')
    const body = report.pairs.find((p) => p.label === 'body text')!
    expect(body.ratio).toBeGreaterThan(7)
    expect(body.grade).toBe('AAA')
    // primary button (near-white on near-black) also strong.
    const primary = report.pairs.find((p) => p.label === 'primary button')!
    expect(primary.grade).toBe('AAA')
  })

  it('a saturated token theme still grades its primary pair', () => {
    const report = analyzeThemeContrast('green', 'light')
    const primary = report.pairs.find((p) => p.label === 'primary button')
    expect(primary).toBeDefined()
    expect(primary!.ratio).toBeGreaterThan(1)
  })

  it('reports the scheme actually analyzed', () => {
    expect(analyzeThemeContrast('default', 'dark').scheme).toBe('dark')
    expect(analyzeThemeContrast('default', 'system').scheme).toBe('light')
  })
})

describe('analyzeDocumentContrast', () => {
  it('grades token-styled text nodes and threads inheritance', () => {
    const doc = buildDocument({
      root: {
        canonical: 'box',
        style: { classes: { root: 'bg-background' } },
        children: [
          { canonical: 'heading', nodeProps: { content: 'Title' } }, // inherits foreground/background
          {
            canonical: 'text',
            nodeProps: { content: 'Muted' },
            style: { classes: { root: 'text-muted-foreground' } },
          },
        ],
      },
    })
    const report = analyzeDocumentContrast(doc)
    const title = report.nodes.find((n) => n.nodeId === 'heading-1')!
    expect(title.foreground).toBe('foreground')
    expect(title.background).toBe('background')
    expect(title.grade).toBe('AAA')
    const muted = report.nodes.find((n) => n.nodeId === 'text-1')!
    expect(muted.foreground).toBe('muted-foreground')
    expect(typeof muted.ratio).toBe('number')
  })

  it('inherits a parent’s background token (bg-primary → child text)', () => {
    const doc = buildDocument({
      root: {
        canonical: 'box',
        style: { classes: { root: 'bg-primary' } },
        children: [
          {
            canonical: 'text',
            nodeProps: { content: 'On primary' },
            style: { classes: { root: 'text-primary-foreground' } },
          },
        ],
      },
    })
    const n = analyzeDocumentContrast(doc).nodes.find((x) => x.nodeId === 'text-1')!
    expect(n.background).toBe('primary')
    expect(n.foreground).toBe('primary-foreground')
    expect(n.grade).not.toBe('Fail') // primary-foreground on primary is legible by design
  })

  it('flags literal/arbitrary colors as indeterminate', () => {
    const doc = buildDocument({
      root: {
        canonical: 'box',
        children: [
          {
            canonical: 'text',
            nodeProps: { content: 'Gray' },
            style: { classes: { root: 'text-gray-400' } },
          },
        ],
      },
    })
    const n = analyzeDocumentContrast(doc).nodes.find((x) => x.nodeId === 'text-1')!
    expect(n.indeterminate).toBe(true)
    expect(n.ratio).toBeUndefined()
    expect(n.note).toMatch(/render_image/)
  })

  it('reports only text-bearing nodes', () => {
    const doc = buildDocument({
      root: { canonical: 'box', children: [{ canonical: 'divider' }] },
    })
    expect(analyzeDocumentContrast(doc).nodes).toEqual([])
  })
})
