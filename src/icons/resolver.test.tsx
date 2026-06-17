// Phase 27 Group A — the icon resolver seam. Verifies the default lucide
// resolver returns a node for known + unknown names (unknown degrades, never
// throws), and that registerIconResolver swaps the active resolver and can be
// restored.
import { isValidElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  isKnownLucideIcon,
  registerIconResolver,
  resolveIcon,
  type IconResolver,
} from './resolver'

afterEach(() => registerIconResolver()) // restore the built-in lucide resolver

describe('icon resolver', () => {
  it('default resolver returns a node for known and unknown names', () => {
    expect(isValidElement(resolveIcon('star', 20))).toBe(true)
    // unknown name must not throw — it degrades to the fallback node
    expect(isValidElement(resolveIcon('definitely-not-an-icon', 20))).toBe(true)
  })

  it('isKnownLucideIcon reflects the lucide set', () => {
    expect(isKnownLucideIcon('shopping-cart')).toBe(true)
    expect(isKnownLucideIcon('alert-circle')).toBe(true) // legacy quick-pick
    expect(isKnownLucideIcon('definitely-not-an-icon')).toBe(false)
  })

  it('registerIconResolver swaps the active resolver; no-arg restores it', () => {
    const custom: IconResolver = (name, sizePx) => `${name}@${sizePx}`
    registerIconResolver(custom)
    expect(resolveIcon('home', 16)).toBe('home@16')
    registerIconResolver()
    expect(isValidElement(resolveIcon('home', 16))).toBe(true)
  })
})
