import { beforeAll, describe, expect, it } from 'vitest'
import { buildDocument } from './build'
import {
  addNode,
  moveNode,
  removeNode,
  updateNodeProps,
  updateNodeStyle,
} from './edit'

beforeAll(async () => {
  await import('@/registry/components')
})

const base = () =>
  buildDocument({
    root: {
      canonical: 'box',
      children: [
        { canonical: 'heading', nodeProps: { content: 'Title' } },
        { canonical: 'card', slots: { body: [{ canonical: 'text' }] } },
      ],
    },
  })

describe('addNode', () => {
  it('appends under a Pattern A canvas and returns the new id', () => {
    const { document, nodeId } = addNode(base(), { canonical: 'button' }, 'ROOT')
    expect(nodeId).toBe('button-1')
    const tree = JSON.parse(document.craftJson)
    expect(tree.ROOT.nodes).toContain('button-1')
    expect(tree['button-1'].parent).toBe('ROOT')
  })

  it('inserts at an index and continues id numbering past existing ids', () => {
    const { document, nodeId } = addNode(
      base(),
      { canonical: 'heading' },
      'ROOT',
      { index: 0 },
    )
    expect(nodeId).toBe('heading-2') // heading-1 exists
    const tree = JSON.parse(document.craftJson)
    expect(tree.ROOT.nodes[0]).toBe('heading-2')
  })

  it('targets a Pattern B slot via { slot }', () => {
    const { document, nodeId } = addNode(
      base(),
      { canonical: 'button' },
      'card-1',
      { slot: 'footer' },
    )
    const tree = JSON.parse(document.craftJson)
    const footerId = tree['card-1'].linkedNodes.footer
    expect(tree[footerId].nodes).toContain(nodeId)
    expect(tree[nodeId].parent).toBe(footerId)
  })

  it('refuses children directly on a multi-canvas parent or a leaf', () => {
    expect(() => addNode(base(), { canonical: 'text' }, 'card-1')).toThrow(
      /multi-canvas — pass a slot/,
    )
    expect(() => addNode(base(), { canonical: 'text' }, 'heading-1')).toThrow(
      /not a canvas/,
    )
    expect(() =>
      addNode(base(), { canonical: 'text' }, 'card-1', { slot: 'nope' }),
    ).toThrow(/no slot "nope"/)
  })

  it('the input document is never mutated', () => {
    const doc = base()
    const before = doc.craftJson
    addNode(doc, { canonical: 'button' }, 'ROOT')
    expect(doc.craftJson).toBe(before)
  })
})

describe('updateNodeProps / updateNodeStyle', () => {
  it('merges + schema-checks a props patch', () => {
    const doc = updateNodeProps(base(), 'heading-1', { content: 'New' })
    const tree = JSON.parse(doc.craftJson)
    expect(tree['heading-1'].props.nodeProps.content).toBe('New')
    expect(tree['heading-1'].props.nodeProps.level).toBe('2') // default kept
    expect(() => updateNodeProps(base(), 'heading-1', { level: 99 })).toThrow(
      /invalid props/,
    )
  })

  it('creates containers for slots a props change introduces (tabs)', () => {
    const tabs = [
      { id: 'a', value: 'a', label: 'A' },
      { id: 'b', value: 'b', label: 'B' },
    ]
    const doc0 = buildDocument({
      root: { canonical: 'tabs', nodeProps: { tabs: [tabs[0]] } },
    })
    const before = Object.keys(JSON.parse(doc0.craftJson).ROOT.linkedNodes)
    expect(before).toHaveLength(1)
    const doc1 = updateNodeProps(doc0, 'ROOT', { tabs })
    const after = JSON.parse(doc1.craftJson).ROOT.linkedNodes
    expect(Object.keys(after)).toHaveLength(2)
  })

  it('merges style classes per slot', () => {
    const doc = updateNodeStyle(base(), 'heading-1', {
      classes: { root: 'text-4xl' },
    })
    const tree = JSON.parse(doc.craftJson)
    expect(tree['heading-1'].props.style.classes.root).toBe('text-4xl')
  })

  it('refuses to edit slot containers directly', () => {
    const doc = base()
    const tree = JSON.parse(doc.craftJson)
    const slotId = tree['card-1'].linkedNodes.body
    expect(() => updateNodeProps(doc, slotId, {})).toThrow(/slot container/)
  })
})

describe('removeNode', () => {
  it('removes a node and its whole subtree (incl. linked slot nodes)', () => {
    const doc = removeNode(base(), 'card-1')
    const tree = JSON.parse(doc.craftJson)
    expect(tree['card-1']).toBeUndefined()
    expect(tree['text-1']).toBeUndefined() // was inside the card's body slot
    expect(tree.ROOT.nodes).toEqual(['heading-1'])
    // No dangling slot containers left behind.
    for (const node of Object.values<{ parent: string | null }>(tree)) {
      if (node.parent) expect(tree[node.parent]).toBeDefined()
    }
  })

  it('protects ROOT and slot containers', () => {
    expect(() => removeNode(base(), 'ROOT')).toThrow(/document root/)
    const doc = base()
    const slotId = JSON.parse(doc.craftJson)['card-1'].linkedNodes.body
    expect(() => removeNode(doc, slotId)).toThrow(/structural/)
  })
})

describe('moveNode', () => {
  it('moves into a slot and updates both sides', () => {
    const doc = moveNode(base(), 'heading-1', 'card-1', { slot: 'header' })
    const tree = JSON.parse(doc.craftJson)
    const headerId = tree['card-1'].linkedNodes.header
    expect(tree.ROOT.nodes).toEqual(['card-1'])
    expect(tree[headerId].nodes).toContain('heading-1')
    expect(tree['heading-1'].parent).toBe(headerId)
  })

  it('refuses cycles', () => {
    // Try to move the card into its own body slot.
    expect(() => moveNode(base(), 'card-1', 'card-1', { slot: 'body' })).toThrow(
      /own subtree/,
    )
  })
})
