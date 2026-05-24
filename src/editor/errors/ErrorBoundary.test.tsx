import { describe, expect, it } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

// Vitest runs without a DOM, so we exercise the boundary's pure static method
// rather than full render lifecycle. The runtime catch path lives in
// React's class lifecycle — covered by manual smoke (drop a throwing
// canonical → fallback renders).
describe('ErrorBoundary.getDerivedStateFromError', () => {
  it('returns { error } so render() switches to fallback', () => {
    const err = new Error('boom')
    expect(ErrorBoundary.getDerivedStateFromError(err)).toEqual({ error: err })
  })

  it('captures different error subclasses', () => {
    const typeErr = new TypeError('type boom')
    expect(ErrorBoundary.getDerivedStateFromError(typeErr).error).toBe(typeErr)
  })
})
