import { describe, expect, it } from 'vitest'
import type { NodeStyle } from '@/registry/types'
import { composeInlineStyle } from './inline'
import { composeResponsive } from './responsive'

// Slot routing for Pattern B canonicals. The composeResponsive / composeInlineStyle
// helpers must read from ANY slot, not just 'root'. These tests lock in that
// behavior so the slot picker UX can rely on per-slot reads/writes.

describe('composeResponsive with non-root slots', () => {
  it('reads style.classes[<slot>] for a named slot', () => {
    const style: NodeStyle = {
      classes: { root: 'border', header: 'bg-card p-4', body: 'p-6' },
    }
    expect(composeResponsive(style, 'root')).toBe('border')
    expect(composeResponsive(style, 'header')).toBe('bg-card p-4')
    expect(composeResponsive(style, 'body')).toBe('p-6')
  })

  it('returns empty string for an undefined slot', () => {
    const style: NodeStyle = { classes: { root: 'border' } }
    expect(composeResponsive(style, 'footer')).toBe('')
  })

  it('merges responsive variants per slot, prefixed by breakpoint', () => {
    const style: NodeStyle = {
      classes: { header: 'bg-card p-4' },
      responsive: {
        md: { header: 'p-6' },
        lg: { header: 'p-8 bg-muted' },
      },
    }
    expect(composeResponsive(style, 'header').split(/\s+/).sort()).toEqual([
      'bg-card',
      'lg:bg-muted',
      'lg:p-8',
      'md:p-6',
      'p-4',
    ])
  })

  it('non-root slots are isolated — editing one slot does not bleed into another', () => {
    const style: NodeStyle = {
      classes: { header: 'p-4', body: 'p-6' },
      responsive: { md: { header: 'p-8' } },
    }
    expect(composeResponsive(style, 'header').split(/\s+/).sort()).toEqual(['md:p-8', 'p-4'])
    expect(composeResponsive(style, 'body')).toBe('p-6') // unaffected by md.header
  })
})

describe('composeInlineStyle with non-root slots', () => {
  it('reads style.inline[<slot>] for a named slot', () => {
    const style: NodeStyle = {
      classes: { root: '', header: '' },
      inline: { header: { backgroundColor: '#fa8072', padding: '13px' } },
    }
    expect(composeInlineStyle(style, 'header')).toEqual({
      backgroundColor: '#fa8072',
      padding: '13px',
    })
  })

  it('returns undefined for slots with no inline overrides', () => {
    const style: NodeStyle = {
      classes: { root: '', header: '' },
      inline: { header: { backgroundColor: '#fa8072' } },
    }
    expect(composeInlineStyle(style, 'root')).toBeUndefined()
    expect(composeInlineStyle(style, 'body')).toBeUndefined()
  })

  it('returns undefined when inline is missing entirely', () => {
    const style: NodeStyle = { classes: { root: '' } }
    expect(composeInlineStyle(style, 'root')).toBeUndefined()
    expect(composeInlineStyle(style, 'header')).toBeUndefined()
  })
})
