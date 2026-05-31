import { describe, expect, it } from 'vitest'
import { getAdapter } from '@/adapters/AdapterContext'
// Importing each opt-in adapter entry must register its adapter (the
// modules double as the `@crafted-design/editor/adapters/<id>` subpath
// entries). Guards against the registration being removed — and, paired
// with the `sideEffects` list, against the build tree-shaking the
// side-effect import out of the published bundle (the Phase 15 bug class).
import '@/adapters/shadcn'
import '@/adapters/mui'

describe('built-in adapter entries register on import (Phase 16 § 8.3)', () => {
  it('shadcn registers', () => {
    expect(getAdapter('shadcn')?.id).toBe('shadcn')
  })

  it('mui registers', () => {
    expect(getAdapter('mui')?.id).toBe('mui')
  })

  it('both cover the same canonical id set (no drift)', () => {
    const shadcn = Object.keys(getAdapter('shadcn')!.components).sort()
    const mui = Object.keys(getAdapter('mui')!.components).sort()
    expect(mui).toEqual(shadcn)
  })
})
