import { beforeAll, describe, expect, it } from 'vitest'
import { buildDocument } from './build'
import { validateDocument } from './validate'

beforeAll(async () => {
  await import('@/registry/components')
})

describe('validateDocument', () => {
  it('a built document is clean', () => {
    const doc = buildDocument({
      root: {
        canonical: 'box',
        children: [
          { canonical: 'heading' },
          { canonical: 'card', slots: { body: [{ canonical: 'text' }] } },
        ],
      },
    })
    const result = validateDocument(doc)
    expect(result.issues).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('flags a broken parent pointer as an error', () => {
    const doc = buildDocument({
      root: { canonical: 'box', children: [{ canonical: 'text' }] },
    })
    const tree = JSON.parse(doc.craftJson)
    tree['text-1'].parent = 'nowhere'
    const result = validateDocument({ ...doc, craftJson: JSON.stringify(tree) })
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.severity === 'error')).toBe(true)
  })

  it('flags orphans as warnings (document still loads)', () => {
    const doc = buildDocument({ root: { canonical: 'box' } })
    const tree = JSON.parse(doc.craftJson)
    tree['stray-1'] = { ...tree.ROOT, parent: null, nodes: [] }
    const result = validateDocument({ ...doc, craftJson: JSON.stringify(tree) })
    expect(result.ok).toBe(true)
    expect(
      result.issues.some(
        (i) => i.severity === 'warning' && i.nodeId === 'stray-1',
      ),
    ).toBe(true)
  })

  it('flags bad props via the semantic checker', () => {
    const doc = buildDocument({ root: { canonical: 'heading' } })
    const tree = JSON.parse(doc.craftJson)
    tree.ROOT.props.nodeProps.level = 99 // schema says enum of strings
    const result = validateDocument({ ...doc, craftJson: JSON.stringify(tree) })
    expect(result.issues.some((i) => i.nodeId === 'ROOT')).toBe(true)
  })

  it('rejects a non-envelope outright', () => {
    const result = validateDocument({
      version: 'x',
    } as unknown as Parameters<typeof validateDocument>[0])
    expect(result.ok).toBe(false)
  })
})
