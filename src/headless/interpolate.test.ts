import { describe, expect, it } from 'vitest'
import { extractTemplateRefs, interpolate, lookupValue } from './interpolate'

describe('interpolate', () => {
  it('substitutes a flat key', () => {
    expect(interpolate('Hi {{ name }}', { name: 'Jane' })).toBe('Hi Jane')
  })

  it('resolves dot-paths against a flat map OR a nested object', () => {
    expect(interpolate('{{ contact.name }}', { 'contact.name': 'Jane' })).toBe('Jane')
    expect(interpolate('{{ contact.name }}', { contact: { name: 'Jane' } })).toBe('Jane')
  })

  it('is whitespace-tolerant and handles multiple/repeat tokens', () => {
    expect(interpolate('{{a}} {{ a }} {{  b  }}', { a: '1', b: '2' })).toBe('1 1 2')
  })

  it('stringifies non-string values', () => {
    expect(interpolate('n={{ n }} ok={{ ok }}', { n: 42, ok: true })).toBe('n=42 ok=true')
  })

  it('keeps the raw token for a missing value by default', () => {
    expect(interpolate('Hi {{ name }}', {})).toBe('Hi {{ name }}')
  })

  it('blanks a missing value when onMissing=blank', () => {
    expect(interpolate('Hi {{ name }}!', {}, { onMissing: 'blank' })).toBe('Hi !')
  })

  it('leaves non-interpolation content untouched (no control flow / filters)', () => {
    // Unclosed / non-matching constructs pass through verbatim.
    expect(interpolate('{% if x %}', { x: 1 })).toBe('{% if x %}')
    expect(interpolate('{{ a | upper }}', { a: 'x' })).toBe('{{ a | upper }}')
    expect(interpolate('plain text', { a: '1' })).toBe('plain text')
    expect(interpolate('{{ unclosed', {})).toBe('{{ unclosed')
  })

  it('does not interpret HTML in values (caller renders as text)', () => {
    // interpolate returns the raw string; escaping is the renderer's job (React
    // text children). We just assert no transformation happens here.
    expect(interpolate('{{ x }}', { x: '<b>hi</b>' })).toBe('<b>hi</b>')
  })
})

describe('extractTemplateRefs', () => {
  it('returns the distinct keys', () => {
    expect(extractTemplateRefs('{{ a }} {{ b.c }} {{ a }}')).toEqual(['a', 'b.c'])
  })
  it('is empty for non-templated strings', () => {
    expect(extractTemplateRefs('no tokens here')).toEqual([])
  })
})

describe('lookupValue', () => {
  it('prefers a flat key over a nested walk', () => {
    expect(lookupValue({ 'a.b': 'flat', a: { b: 'nested' } }, 'a.b')).toBe('flat')
  })
  it('returns undefined for an unresolved path', () => {
    expect(lookupValue({ a: {} }, 'a.b.c')).toBeUndefined()
  })
})
