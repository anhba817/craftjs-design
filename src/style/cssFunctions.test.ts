import { describe, expect, it } from 'vitest'
import {
  FILTER_FNS,
  TRANSFORM_FNS,
  composeFunctionList,
  parseFunctionList,
  setFunctionArg,
} from './cssFunctions'

describe('parseFunctionList', () => {
  it('returns {} for empty input', () => {
    expect(parseFunctionList('')).toEqual({})
  })

  it('parses a transform value into a fn→arg map', () => {
    expect(parseFunctionList('rotate(45deg) scale(1.1) translateX(4px)')).toEqual({
      rotate: '45deg',
      scale: '1.1',
      translateX: '4px',
    })
  })

  it('parses hyphenated function names + NESTED parens (drop-shadow)', () => {
    // The balanced scanner keeps the whole rgb(...) arg intact.
    expect(
      parseFunctionList('blur(4px) drop-shadow(0 4px 3px rgb(0 0 0 / 0.07))'),
    ).toEqual({
      blur: '4px',
      'drop-shadow': '0 4px 3px rgb(0 0 0 / 0.07)',
    })
  })

  it('round-trips a nested-paren drop-shadow through compose', () => {
    const map = parseFunctionList('drop-shadow(0 4px 3px rgb(0 0 0 / 0.07))')
    expect(composeFunctionList(map, FILTER_FNS)).toBe(
      'drop-shadow(0 4px 3px rgb(0 0 0 / 0.07))',
    )
  })

  it('parses a filter value', () => {
    expect(parseFunctionList('brightness(1.1) contrast(0.75) grayscale(100%)')).toEqual({
      brightness: '1.1',
      contrast: '0.75',
      grayscale: '100%',
    })
  })
})

describe('composeFunctionList', () => {
  it('emits in the given order, skipping empty args', () => {
    const out = composeFunctionList(
      { scale: '1.1', rotate: '45deg', skewX: '' },
      TRANSFORM_FNS,
    )
    expect(out).toBe('rotate(45deg) scale(1.1)')
  })

  it('appends unknown functions after the ordered ones', () => {
    const out = composeFunctionList(
      { rotate: '45deg', perspective: '500px' },
      TRANSFORM_FNS,
    )
    expect(out).toBe('rotate(45deg) perspective(500px)')
  })

  it('returns empty string when nothing set', () => {
    expect(composeFunctionList({}, FILTER_FNS)).toBe('')
  })
})

describe('setFunctionArg', () => {
  it('adds a function, preserving others in order', () => {
    const out = setFunctionArg('rotate(45deg)', TRANSFORM_FNS, 'scale', '1.25')
    expect(out).toBe('rotate(45deg) scale(1.25)')
  })

  it('replaces an existing function arg', () => {
    const out = setFunctionArg('rotate(45deg) scale(1.1)', TRANSFORM_FNS, 'rotate', '90deg')
    expect(out).toBe('rotate(90deg) scale(1.1)')
  })

  it('removes a function when arg is empty', () => {
    const out = setFunctionArg('rotate(45deg) scale(1.1)', TRANSFORM_FNS, 'rotate', '')
    expect(out).toBe('scale(1.1)')
  })

  it('removes a function when arg is undefined', () => {
    const out = setFunctionArg('blur(4px) brightness(1.1)', FILTER_FNS, 'blur', undefined)
    expect(out).toBe('brightness(1.1)')
  })

  it('round-trips an unrelated function untouched', () => {
    // filter has blur; setting brightness shouldn't disturb blur.
    const out = setFunctionArg('blur(8px)', FILTER_FNS, 'brightness', '1.5')
    expect(parseFunctionList(out)).toEqual({ blur: '8px', brightness: '1.5' })
  })
})
