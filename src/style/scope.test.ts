// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { SCOPE_CLASS, getScopedPortalRoot } from './scope'

afterEach(() => {
  document.getElementById('crafted-design-portal-root')?.remove()
})

describe('getScopedPortalRoot', () => {
  it('creates a body-level container carrying the scope class', () => {
    const root = getScopedPortalRoot()
    expect(root.parentElement).toBe(document.body)
    expect(root.classList.contains(SCOPE_CLASS)).toBe(true)
  })

  it('is idempotent — repeated calls return the same single element', () => {
    const a = getScopedPortalRoot()
    const b = getScopedPortalRoot()
    expect(a).toBe(b)
    expect(
      document.querySelectorAll('#crafted-design-portal-root'),
    ).toHaveLength(1)
  })
})
