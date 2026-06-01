import { describe, expect, it } from 'vitest'
// Register the built-in canonicals so getComponentByDisplayName resolves
// 'Button' / 'Box' to their propsSchema.
import '@/registry/components'
import { validateDocumentSemantics } from './documentSemantics'

// Build a craftJson string from a node map (the shape Craft serializes).
const doc = (nodes: Record<string, unknown>) => JSON.stringify(nodes)

const ROOT = { type: { resolvedName: 'Box' }, props: {} }

describe('validateDocumentSemantics', () => {
  it('returns no issues for a clean document', () => {
    const json = doc({
      ROOT,
      btn: {
        type: { resolvedName: 'Button' },
        props: {
          nodeProps: { label: 'Hi' },
          style: { classes: { root: 'p-2' } },
        },
      },
    })
    expect(validateDocumentSemantics(json)).toEqual([])
  })

  it('flags a wrong-typed prop (label is a number)', () => {
    const json = doc({
      ROOT,
      btn: {
        type: { resolvedName: 'Button' },
        props: { nodeProps: { label: 42 } },
      },
    })
    const issues = validateDocumentSemantics(json)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ nodeId: 'btn', kind: 'props' })
    expect(issues[0].message).toContain('label')
  })

  it('flags a malformed style block (classes is a string)', () => {
    const json = doc({
      ROOT,
      btn: {
        type: { resolvedName: 'Button' },
        props: { nodeProps: { label: 'Hi' }, style: { classes: 'oops' } },
      },
    })
    const issues = validateDocumentSemantics(json)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ nodeId: 'btn', kind: 'style' })
  })

  it('tolerates a legitimately-partial nodeProps (relies on defaults)', () => {
    // `disabled` / `intent` absent — a node using canonical defaults is NOT
    // corruption. `.partial()` only flags present-but-wrong fields.
    const json = doc({
      ROOT,
      btn: {
        type: { resolvedName: 'Button' },
        props: { nodeProps: { label: 'Hi' } },
      },
    })
    expect(validateDocumentSemantics(json)).toEqual([])
  })

  it('skips a minimal node with empty props', () => {
    expect(validateDocumentSemantics(doc({ ROOT }))).toEqual([])
  })

  it('skips plain <div> canvas slots and unknown types', () => {
    const json = doc({
      ROOT,
      slot: { type: 'div', props: { style: { classes: 'oops' } } },
      ghost: {
        type: { resolvedName: 'NotARealCanonical' },
        props: { nodeProps: { label: 42 } },
      },
    })
    expect(validateDocumentSemantics(json)).toEqual([])
  })

  it('reports issues across multiple nodes', () => {
    const json = doc({
      ROOT,
      a: {
        type: { resolvedName: 'Button' },
        props: { nodeProps: { label: 1 } },
      },
      b: {
        type: { resolvedName: 'Button' },
        props: { style: { classes: [] } },
      },
    })
    const issues = validateDocumentSemantics(json)
    expect(issues.map((i) => i.nodeId).sort()).toEqual(['a', 'b'])
  })

  it('never throws on non-JSON (structural check owns that)', () => {
    expect(validateDocumentSemantics('not json{')).toEqual([])
    expect(validateDocumentSemantics('[]')).toEqual([])
  })
})
