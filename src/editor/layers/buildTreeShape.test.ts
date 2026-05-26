import { describe, expect, it } from 'vitest'
import { buildTreeShape, wouldCreateCycle } from './buildTreeShape'
import type { NodeReader } from './buildTreeShape'

/**
 * Build a NodeReader from a plain map. Tests describe trees as
 *   { a: { children: ['b','c'], linked: { header: 'h' } }, ... }
 * without dragging the @craftjs query into unit-test land.
 */
function makeReader(
  spec: Record<
    string,
    {
      displayName?: string
      children?: string[]
      linked?: Record<string, string>
    }
  >,
): NodeReader {
  return {
    getDisplayName: (id) => spec[id]?.displayName ?? id,
    getChildren: (id) => spec[id]?.children ?? [],
    getLinkedNodes: (id) => spec[id]?.linked ?? {},
  }
}

describe('buildTreeShape', () => {
  it('emits a single root row for a leaf root', () => {
    const r = makeReader({ ROOT: {} })
    const out = buildTreeShape(r, 'ROOT')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ id: 'ROOT', depth: 0, parentId: null })
  })

  it('walks regular children in DFS pre-order', () => {
    const r = makeReader({
      ROOT: { children: ['a', 'b'] },
      a: { children: ['a1', 'a2'] },
      a1: {},
      a2: {},
      b: {},
    })
    const out = buildTreeShape(r, 'ROOT')
    expect(out.map((n) => n.id)).toEqual(['ROOT', 'a', 'a1', 'a2', 'b'])
  })

  it('assigns depth from the root', () => {
    const r = makeReader({
      ROOT: { children: ['a'] },
      a: { children: ['b'] },
      b: { children: ['c'] },
      c: {},
    })
    const out = buildTreeShape(r, 'ROOT')
    expect(out.map((n) => n.depth)).toEqual([0, 1, 2, 3])
  })

  it('marks hasChildren based on EITHER regular children or linked nodes', () => {
    const r = makeReader({
      ROOT: { children: ['a', 'b'] },
      a: {}, // truly empty
      b: { linked: { header: 'h' } }, // only linked, no children
      h: {},
    })
    const out = buildTreeShape(r, 'ROOT')
    const map = Object.fromEntries(out.map((n) => [n.id, n.hasChildren]))
    expect(map.ROOT).toBe(true)
    expect(map.a).toBe(false)
    expect(map.b).toBe(true) // linked counts
  })

  it('walks linked nodes after regular children, alphabetically by slot', () => {
    const r = makeReader({
      ROOT: { children: ['x'], linked: { body: 'B', header: 'H' } },
      x: {},
      H: {},
      B: {},
    })
    const out = buildTreeShape(r, 'ROOT')
    // Order: ROOT, x (regular), B (linked 'body'), H (linked 'header')
    expect(out.map((n) => n.id)).toEqual(['ROOT', 'x', 'B', 'H'])
  })

  it('tags linked-node rows with their slot name', () => {
    const r = makeReader({
      ROOT: { linked: { header: 'H' } },
      H: {},
    })
    const out = buildTreeShape(r, 'ROOT')
    const h = out.find((n) => n.id === 'H')
    expect(h?.linkedSlot).toBe('header')
    expect(out[0].linkedSlot).toBeUndefined() // ROOT not linked
  })

  it('stops recursion at collapsed ids but still includes the collapsed row', () => {
    const r = makeReader({
      ROOT: { children: ['a'] },
      a: { children: ['a1', 'a2'] },
      a1: {},
      a2: {},
    })
    const out = buildTreeShape(r, 'ROOT', new Set(['a']))
    expect(out.map((n) => n.id)).toEqual(['ROOT', 'a'])
    // The collapsed row still reports it has children (chevron stays).
    expect(out.find((n) => n.id === 'a')?.hasChildren).toBe(true)
  })

  it('defends against parent cycles', () => {
    // Pathological: a has a as child. Cycle guard should drop the
    // second visit silently rather than infinite-loop.
    const r = makeReader({
      ROOT: { children: ['a'] },
      a: { children: ['a'] },
    })
    const out = buildTreeShape(r, 'ROOT')
    expect(out.map((n) => n.id)).toEqual(['ROOT', 'a'])
  })
})

describe('wouldCreateCycle', () => {
  it('returns true when target is the dragged id itself', () => {
    const r = makeReader({ a: {} })
    expect(wouldCreateCycle(r, 'a', 'a')).toBe(true)
  })

  it('returns true when target is a regular descendant', () => {
    const r = makeReader({
      a: { children: ['b'] },
      b: { children: ['c'] },
      c: {},
    })
    expect(wouldCreateCycle(r, 'a', 'c')).toBe(true)
  })

  it('returns true when target is a linked descendant', () => {
    const r = makeReader({
      a: { linked: { header: 'h' } },
      h: { children: ['hk'] },
      hk: {},
    })
    expect(wouldCreateCycle(r, 'a', 'hk')).toBe(true)
  })

  it('returns false for siblings / unrelated nodes', () => {
    const r = makeReader({
      ROOT: { children: ['a', 'b'] },
      a: {},
      b: {},
    })
    expect(wouldCreateCycle(r, 'a', 'b')).toBe(false)
    expect(wouldCreateCycle(r, 'a', 'ROOT')).toBe(false)
  })

  it('does not get stuck on cycles in the dragged subtree', () => {
    // Pathological subtree with its own cycle (a → b → a). Cycle
    // check should still terminate.
    const r = makeReader({
      a: { children: ['b'] },
      b: { children: ['a'] },
    })
    expect(wouldCreateCycle(r, 'a', 'unrelated')).toBe(false)
  })
})
