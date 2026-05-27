import { describe, expect, it } from 'vitest'
import type { NodeStyle } from '@/registry/types'
import { composeResponsive } from './responsive'
import { composeResponsiveInline } from './responsive-inline'

// Phase 12 § 4.2 — composition of the state quadrants into prefixed
// classes + pseudo-class CSS rules.

describe('composeResponsive — state prefixes', () => {
  it('emits base, bp, state, and bp:state prefixed classes', () => {
    const style: NodeStyle = {
      classes: { root: 'bg-white' },
      responsive: { md: { root: 'bg-gray-100' } },
      states: { hover: { root: 'bg-primary' } },
      stateResponsive: { md: { hover: { root: 'bg-secondary' } } },
    }
    const out = composeResponsive(style, 'root').split(/\s+/)
    expect(out).toContain('bg-white')
    expect(out).toContain('md:bg-gray-100')
    expect(out).toContain('hover:bg-primary')
    expect(out).toContain('md:hover:bg-secondary')
  })

  it('prefixes every class in a multi-class state bucket', () => {
    const style: NodeStyle = {
      classes: {},
      states: { hover: { root: 'bg-primary text-white' } },
    }
    const out = composeResponsive(style, 'root').split(/\s+/).filter(Boolean)
    expect(out).toEqual(['hover:bg-primary', 'hover:text-white'])
  })

  it('breakpoint is outermost in bp:state prefix', () => {
    const style: NodeStyle = {
      classes: {},
      stateResponsive: { lg: { focus: { root: 'ring-2' } } },
    }
    expect(composeResponsive(style, 'root')).toBe('lg:focus:ring-2')
  })
})

describe('composeResponsiveInline — state pseudo rules', () => {
  it('promotes state inline to a :hover rule', () => {
    const style: NodeStyle = {
      classes: {},
      stateInline: { hover: { root: { transform: 'scale(1.1)' } } },
    }
    const { className, css, consumesBaseInline } = composeResponsiveInline(
      style,
      'root',
    )
    expect(className).toMatch(/^ri-/)
    expect(css).toContain(`.${className}:hover { transform: scale(1.1); }`)
    expect(consumesBaseInline).toBe(true)
  })

  it('promotes bp×state inline to an @media + :hover rule', () => {
    const style: NodeStyle = {
      classes: {},
      stateResponsiveInline: {
        md: { hover: { root: { transform: 'scale(1.2)' } } },
      },
    }
    const { className, css } = composeResponsiveInline(style, 'root')
    expect(css).toContain('@media (min-width: 48rem)')
    expect(css).toContain(`.${className}:hover { transform: scale(1.2); }`)
  })

  it('promotes base inline alongside state so the pseudo rule can win', () => {
    // base inline + hover inline → base must be in the class (not the
    // style attribute) or the inline attr would beat .cls:hover.
    const style: NodeStyle = {
      classes: {},
      inline: { root: { transform: 'scale(1)' } },
      stateInline: { hover: { root: { transform: 'scale(1.1)' } } },
    }
    const { className, css, consumesBaseInline } = composeResponsiveInline(
      style,
      'root',
    )
    expect(consumesBaseInline).toBe(true)
    expect(css).toContain(`.${className} { transform: scale(1); }`)
    expect(css).toContain(`.${className}:hover { transform: scale(1.1); }`)
  })

  it('returns EMPTY when there is no non-base inline', () => {
    const style: NodeStyle = {
      classes: {},
      inline: { root: { color: 'red' } },
    }
    expect(composeResponsiveInline(style, 'root').className).toBe('')
  })
})
