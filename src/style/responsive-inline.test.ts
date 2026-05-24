import { describe, expect, it } from 'vitest'
import { composeResponsiveInline } from './responsive-inline'
import type { NodeStyle } from '@/registry/types'

function styleWith(partial: Partial<NodeStyle>): NodeStyle {
  return { classes: {}, ...partial }
}

describe('composeResponsiveInline', () => {
  it('returns empty result when no responsive entries exist', () => {
    const result = composeResponsiveInline(
      styleWith({ inline: { root: { backgroundColor: '#abc' } } }),
      'root',
    )
    expect(result.className).toBe('')
    expect(result.css).toBe('')
    expect(result.consumesBaseInline).toBe(false)
  })

  it('promotes responsive-only entry into a class with @media rule', () => {
    const result = composeResponsiveInline(
      styleWith({
        responsiveInline: { md: { root: { backgroundColor: '#ff0000' } } },
      }),
      'root',
    )
    expect(result.className).toMatch(/^ri-[a-z0-9]+$/)
    expect(result.css).toContain('@media (min-width: 48rem)')
    expect(result.css).toContain('background-color: #ff0000;')
    expect(result.consumesBaseInline).toBe(true)
  })

  it('promotes base inline into the same class when responsive exists', () => {
    const result = composeResponsiveInline(
      styleWith({
        inline: { root: { backgroundColor: '#000000' } },
        responsiveInline: { md: { root: { backgroundColor: '#ff0000' } } },
      }),
      'root',
    )
    // Base rule appears unconditionally before any media block.
    expect(result.css).toMatch(/\.ri-[a-z0-9]+\s*\{\s*background-color: #000000;\s*\}/)
    expect(result.css).toContain('@media (min-width: 48rem)')
    expect(result.consumesBaseInline).toBe(true)
  })

  it('emits one @media block per breakpoint in min-width order', () => {
    const result = composeResponsiveInline(
      styleWith({
        responsiveInline: {
          md: { root: { backgroundColor: '#ff0000' } },
          lg: { root: { backgroundColor: '#00ff00' } },
          sm: { root: { backgroundColor: '#0000ff' } },
        },
      }),
      'root',
    )
    // The sm block must appear before md, md before lg.
    const smIdx = result.css.indexOf('40rem')
    const mdIdx = result.css.indexOf('48rem')
    const lgIdx = result.css.indexOf('64rem')
    expect(smIdx).toBeGreaterThan(-1)
    expect(mdIdx).toBeGreaterThan(smIdx)
    expect(lgIdx).toBeGreaterThan(mdIdx)
  })

  it('converts camelCase CSS property names to kebab-case', () => {
    const result = composeResponsiveInline(
      styleWith({
        responsiveInline: { md: { root: { borderTopWidth: '4px' } } },
      }),
      'root',
    )
    expect(result.css).toContain('border-top-width: 4px;')
    expect(result.css).not.toContain('borderTopWidth')
  })

  it('returns identical class ids for identical content', () => {
    const a = composeResponsiveInline(
      styleWith({ responsiveInline: { md: { root: { color: '#fff' } } } }),
      'root',
    )
    const b = composeResponsiveInline(
      styleWith({ responsiveInline: { md: { root: { color: '#fff' } } } }),
      'root',
    )
    expect(a.className).toBe(b.className)
  })

  it('returns distinct class ids for different content', () => {
    const a = composeResponsiveInline(
      styleWith({ responsiveInline: { md: { root: { color: '#fff' } } } }),
      'root',
    )
    const b = composeResponsiveInline(
      styleWith({ responsiveInline: { md: { root: { color: '#000' } } } }),
      'root',
    )
    expect(a.className).not.toBe(b.className)
  })

  it('scopes per slot — header entries do not leak into body class', () => {
    const style = styleWith({
      responsiveInline: { md: { header: { color: '#f00' } } },
    })
    const headerResult = composeResponsiveInline(style, 'header')
    const bodyResult = composeResponsiveInline(style, 'body')
    expect(headerResult.className).not.toBe('')
    expect(bodyResult.className).toBe('')
  })
})
