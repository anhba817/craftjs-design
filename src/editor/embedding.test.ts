import { describe, expect, it } from 'vitest'
import { resolveEmbeddingMode } from './embedding'

// Phase 23 § Decision 1 + 4 — the persistence/controlled precedence.
describe('resolveEmbeddingMode', () => {
  it('standalone (no props) persists — behavior unchanged', () => {
    expect(resolveEmbeddingMode({})).toEqual({
      controlled: false,
      persist: true,
    })
  })

  it('persistence={false} opts out of the store, still uncontrolled', () => {
    expect(resolveEmbeddingMode({ persistence: false })).toEqual({
      controlled: false,
      persist: false,
    })
  })

  it('value present → controlled AND persistence forced off', () => {
    expect(
      resolveEmbeddingMode({ value: { craftJson: '{}' } as never }),
    ).toEqual({ controlled: true, persist: false })
  })

  it('controlled wins even if persistence={true} is also passed', () => {
    expect(
      resolveEmbeddingMode({
        value: { craftJson: '{}' } as never,
        persistence: true,
      }),
    ).toEqual({ controlled: true, persist: false })
  })

  it('value can be a JSON string', () => {
    expect(resolveEmbeddingMode({ value: '{"craftJson":"{}"}' })).toEqual({
      controlled: true,
      persist: false,
    })
  })
})
