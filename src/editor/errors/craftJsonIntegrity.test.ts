import { describe, expect, it, beforeAll } from 'vitest'
import { validateCraftJson } from './craftJsonIntegrity'

// The integrity check looks up canonicals in the registry. Pull in the
// side-effect imports the editor uses so the test sees a populated registry.
beforeAll(async () => {
  await import('@/registry/components')
})

function craftJsonOf(tree: Record<string, unknown>): string {
  return JSON.stringify(tree)
}

describe('validateCraftJson', () => {
  it('accepts a minimal valid tree (just ROOT)', () => {
    const result = validateCraftJson(
      craftJsonOf({
        ROOT: { type: { resolvedName: 'Box' }, parent: null, nodes: [] },
      }),
    )
    expect(result.ok).toBe(true)
  })

  it('accepts a parent-child relationship that resolves', () => {
    const result = validateCraftJson(
      craftJsonOf({
        ROOT: { type: { resolvedName: 'Box' }, parent: null, nodes: ['child1'] },
        child1: { type: { resolvedName: 'Box' }, parent: 'ROOT', nodes: [] },
      }),
    )
    expect(result.ok).toBe(true)
  })

  it('accepts type as a string (Craft.js legacy serialisation shape)', () => {
    const result = validateCraftJson(
      craftJsonOf({
        ROOT: { type: 'Box', parent: null, nodes: [] },
      }),
    )
    expect(result.ok).toBe(true)
  })

  it('accepts "div" as a type (Craft.js canvas wrappers)', () => {
    const result = validateCraftJson(
      craftJsonOf({
        ROOT: { type: { resolvedName: 'Box' }, parent: null, nodes: ['slot'] },
        slot: { type: { resolvedName: 'div' }, parent: 'ROOT', nodes: [] },
      }),
    )
    expect(result.ok).toBe(true)
  })

  it('accepts linkedNodes that resolve to existing nodes', () => {
    const result = validateCraftJson(
      craftJsonOf({
        ROOT: {
          type: { resolvedName: 'Box' },
          parent: null,
          nodes: [],
          linkedNodes: { 'tab-overview': 'tabContent' },
        },
        tabContent: {
          type: { resolvedName: 'div' },
          parent: 'ROOT',
          nodes: [],
        },
      }),
    )
    expect(result.ok).toBe(true)
  })

  it('rejects malformed JSON', () => {
    const result = validateCraftJson('{not-json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toMatch(/failed to parse JSON/)
  })

  it('rejects a non-object top-level value', () => {
    const result = validateCraftJson('null')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toMatch(/expected an object/)
  })

  it('rejects an array top-level value', () => {
    const result = validateCraftJson('[]')
    expect(result.ok).toBe(false)
  })

  it('rejects a tree with no ROOT', () => {
    const result = validateCraftJson(
      craftJsonOf({ foo: { type: { resolvedName: 'Box' }, parent: null } }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toMatch(/missing required ROOT/)
  })

  it('rejects an unknown canonical type', () => {
    const result = validateCraftJson(
      craftJsonOf({
        ROOT: { type: { resolvedName: 'NotARealComponent' }, parent: null, nodes: [] },
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.error.message).toMatch(/'NotARealComponent' is not a registered canonical/)
  })

  it('rejects a missing type field', () => {
    const result = validateCraftJson(
      craftJsonOf({
        ROOT: { parent: null, nodes: [] },
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toMatch(/type must be a string/)
  })

  it('rejects a parent ref that points outside the tree', () => {
    const result = validateCraftJson(
      craftJsonOf({
        ROOT: { type: { resolvedName: 'Box' }, parent: null, nodes: [] },
        orphan: { type: { resolvedName: 'Box' }, parent: 'GHOST', nodes: [] },
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.error.message).toMatch(/parent 'GHOST' is not in the tree/)
  })

  it('rejects a nodes[] entry that references a missing child', () => {
    const result = validateCraftJson(
      craftJsonOf({
        ROOT: { type: { resolvedName: 'Box' }, parent: null, nodes: ['ghost'] },
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.error.message).toMatch(/missing child 'ghost'/)
  })

  it('rejects a linkedNodes entry that references a missing node', () => {
    const result = validateCraftJson(
      craftJsonOf({
        ROOT: {
          type: { resolvedName: 'Box' },
          parent: null,
          nodes: [],
          linkedNodes: { slot: 'ghost' },
        },
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.error.message).toMatch(/references missing node 'ghost'/)
  })

  it('rejects a non-string entry in nodes[]', () => {
    const result = validateCraftJson(
      craftJsonOf({
        ROOT: { type: { resolvedName: 'Box' }, parent: null, nodes: [42] },
      }),
    )
    expect(result.ok).toBe(false)
  })
})
