import { beforeAll, describe, expect, it } from 'vitest'
import { CURRENT_DOCUMENT_VERSION } from '@/persistence/schema'
import { parseDocumentJson } from '@/persistence/importDocument'
import { buildDocument, slotKeysFor } from './build'

beforeAll(async () => {
  await import('@/registry/components')
})

describe('buildDocument — Pattern A', () => {
  it('builds an envelope that survives the real import path', () => {
    const doc = buildDocument({
      root: {
        canonical: 'box',
        children: [
          { canonical: 'heading', nodeProps: { content: 'Hello' } },
          { canonical: 'text' },
        ],
      },
    })
    expect(doc.version).toBe(CURRENT_DOCUMENT_VERSION)
    // Round-trip through the editor's own import path (zod envelope parse +
    // migrations) — the same gate a load in the live editor goes through.
    const imported = parseDocumentJson(JSON.stringify(doc))
    const tree = JSON.parse(imported.craftJson)
    expect(tree.ROOT.displayName).toBe('Box')
    expect(tree.ROOT.nodes).toEqual(['heading-1', 'text-1'])
    expect(tree['heading-1'].props.nodeProps.content).toBe('Hello')
    expect(tree['heading-1'].parent).toBe('ROOT')
  })

  it('assigns deterministic readable ids per canonical', () => {
    const doc = buildDocument({
      root: {
        canonical: 'stack',
        children: [
          { canonical: 'text' },
          { canonical: 'text' },
          { canonical: 'button' },
        ],
      },
    })
    const tree = JSON.parse(doc.craftJson)
    expect(tree.ROOT.nodes).toEqual(['text-1', 'text-2', 'button-1'])
  })

  it('rejects invalid props against the canonical schema', () => {
    expect(() =>
      buildDocument({
        root: { canonical: 'heading', nodeProps: { level: 99 } },
      }),
    ).toThrow(/invalid props for "heading"/)
  })

  it('rejects unknown canonicals, leaf children, and bogus slots', () => {
    expect(() => buildDocument({ root: { canonical: 'nope' } })).toThrow(
      /unknown canonical/,
    )
    expect(() =>
      buildDocument({
        root: { canonical: 'button', children: [{ canonical: 'text' }] },
      }),
    ).toThrow(/leaf/)
    expect(() =>
      buildDocument({
        root: { canonical: 'box', slots: { header: [] } },
      }),
    ).toThrow(/no canvas slots/)
  })
})

describe('buildDocument — Pattern B (linkedNodes)', () => {
  it('card: emits a linked slot container per canvas slot, even when empty', () => {
    const doc = buildDocument({
      root: {
        canonical: 'box',
        children: [
          {
            canonical: 'card',
            slots: {
              header: [{ canonical: 'heading', nodeProps: { content: 'Plan' } }],
              body: [{ canonical: 'text' }],
              // footer intentionally omitted — still gets a container.
            },
          },
        ],
      },
    })
    const tree = JSON.parse(doc.craftJson)
    const card = tree['card-1']
    expect(Object.keys(card.linkedNodes).sort()).toEqual([
      'body',
      'footer',
      'header',
    ])
    const header = tree[card.linkedNodes.header]
    // Mirrors CanonicalNode's <Element is="div" canvas className="canvas-slot">.
    expect(header.type).toBe('div')
    expect(header.isCanvas).toBe(true)
    expect(header.props.className).toBe('canvas-slot')
    expect(header.parent).toBe('card-1')
    expect(header.nodes).toHaveLength(1)
    expect(tree[header.nodes[0]].props.nodeProps.content).toBe('Plan')
    const footer = tree[card.linkedNodes.footer]
    expect(footer.nodes).toEqual([])
  })

  it('rejects children + unknown slot keys on Pattern B canonicals', () => {
    expect(() =>
      buildDocument({
        root: { canonical: 'card', children: [{ canonical: 'text' }] },
      }),
    ).toThrow(/multi-canvas/)
    expect(() =>
      buildDocument({
        root: { canonical: 'card', slots: { sidebar: [] } },
      }),
    ).toThrow(/no slot "sidebar"/)
  })

  it('tabs: dynamic slot keys follow the resolved props', () => {
    // Tab slots key on each tab's `id`. Supply explicit ids — when omitted,
    // the schema defaults them to generated uniques (same as the editor).
    const tabs = [
      { id: 'one', value: 'one', label: 'One' },
      { id: 'two', value: 'two', label: 'Two' },
    ]
    const keys = slotKeysFor('tabs', { tabs })
    expect(keys).toHaveLength(2)
    const doc = buildDocument({
      root: {
        canonical: 'tabs',
        nodeProps: { tabs },
        slots: Object.fromEntries(keys.map((k) => [k, [{ canonical: 'text' }]])),
      },
    })
    const tree = JSON.parse(doc.craftJson)
    expect(Object.keys(tree.ROOT.linkedNodes).sort()).toEqual([...keys].sort())
    for (const key of keys) {
      expect(tree[tree.ROOT.linkedNodes[key]].nodes).toHaveLength(1)
    }
  })

  it('table: slot containers use the slotComponent canonical (table-cell)', () => {
    const doc = buildDocument({ root: { canonical: 'table' } })
    const tree = JSON.parse(doc.craftJson)
    const linked = Object.values(tree.ROOT.linkedNodes) as string[]
    expect(linked.length).toBeGreaterThan(0)
    const cell = tree[linked[0]]
    expect(cell.type).toEqual({ resolvedName: 'Table Cell' })
    expect(cell.props.canonicalId).toBe('table-cell')
    expect(cell.parent).toBe('ROOT')
  })

  it('whole-document validation: every parent/linked pointer is consistent', () => {
    const doc = buildDocument({
      root: {
        canonical: 'box',
        children: [
          { canonical: 'card', slots: { body: [{ canonical: 'button' }] } },
          { canonical: 'table' },
        ],
      },
    })
    const tree = JSON.parse(doc.craftJson) as Record<
      string,
      {
        parent: string | null
        nodes: string[]
        linkedNodes: Record<string, string>
      }
    >
    for (const [id, node] of Object.entries(tree)) {
      for (const child of node.nodes) {
        expect(tree[child].parent).toBe(id)
      }
      for (const linked of Object.values(node.linkedNodes)) {
        expect(tree[linked].parent).toBe(id)
      }
    }
  })
})
