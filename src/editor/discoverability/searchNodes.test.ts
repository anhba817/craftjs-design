import { describe, expect, it } from 'vitest'
import { searchNodes } from './searchNodes'
import type { SearchableNode } from './searchNodes'

const sample: SearchableNode[] = [
  { id: 'a', displayName: 'Heading', textProps: { content: 'Welcome to my site' } },
  { id: 'b', displayName: 'Text', textProps: { content: 'Lorem ipsum dolor.' } },
  { id: 'c', displayName: 'Button', textProps: { label: 'Sign up' } },
  { id: 'd', displayName: 'Image', tags: ['media', 'banner'], textProps: { alt: 'Welcome banner' } },
  { id: 'e', displayName: 'Card', tags: ['layout'] },
]

describe('searchNodes', () => {
  it('returns [] for empty / whitespace term', () => {
    expect(searchNodes(sample, '')).toEqual([])
    expect(searchNodes(sample, '   ')).toEqual([])
  })

  it('matches displayName case-insensitively', () => {
    const out = searchNodes(sample, 'button')
    expect(out.map((n) => n.id)).toEqual(['c'])
  })

  it('matches a tag', () => {
    const out = searchNodes(sample, 'banner')
    expect(out.map((n) => n.id)).toContain('d')
  })

  it('matches a textProp (content)', () => {
    const out = searchNodes(sample, 'lorem')
    expect(out.map((n) => n.id)).toEqual(['b'])
  })

  it('matches a textProp (label on Button)', () => {
    const out = searchNodes(sample, 'sign')
    expect(out.map((n) => n.id)).toEqual(['c'])
  })

  it('matches a textProp (alt on Image)', () => {
    const out = searchNodes(sample, 'welcome')
    // 'welcome' is in Heading's content AND in Image's alt.
    expect(out.map((n) => n.id).sort()).toEqual(['a', 'd'])
  })

  it('preserves caller order (DOM order)', () => {
    // 'welcome' matches a then d; a comes before d in `sample`.
    const out = searchNodes(sample, 'welcome')
    expect(out.map((n) => n.id)).toEqual(['a', 'd'])
  })

  it('substring match works (not full-word)', () => {
    const out = searchNodes(sample, 'ipsum')
    expect(out.map((n) => n.id)).toContain('b')
  })

  it('case-insensitive across all fields', () => {
    expect(searchNodes(sample, 'HEADING').map((n) => n.id)).toEqual(['a'])
    expect(searchNodes(sample, 'MEDIA').map((n) => n.id)).toEqual(['d'])
  })
})
