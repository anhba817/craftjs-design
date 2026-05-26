import { describe, expect, it } from 'vitest'
import { cloneNodeTree } from './cloneNodeTree'

// Deterministic id generator so the test snapshots are stable.
function counterGen(): () => string {
  let n = 0
  return () => `new-${++n}`
}

describe('cloneNodeTree', () => {
  it('rewrites every node id', () => {
    const tree = {
      rootNodeId: 'a',
      nodes: {
        a: { data: { parent: null, nodes: ['b'], linkedNodes: {} } },
        b: { data: { parent: 'a', nodes: [], linkedNodes: {} } },
      },
    }
    const out = cloneNodeTree(tree, counterGen())
    expect(out.rootNodeId).toBe('new-1')
    expect(Object.keys(out.nodes).sort()).toEqual(['new-1', 'new-2'])
  })

  it("preserves the root's external parent (null)", () => {
    const tree = {
      rootNodeId: 'r',
      nodes: {
        r: { data: { parent: null, nodes: [], linkedNodes: {} } },
      },
    }
    const out = cloneNodeTree(tree, counterGen())
    expect(out.nodes['new-1'].data.parent).toBeNull()
  })

  it("rewrites a child's parent ref", () => {
    const tree = {
      rootNodeId: 'r',
      nodes: {
        r: { data: { parent: null, nodes: ['c1'], linkedNodes: {} } },
        c1: { data: { parent: 'r', nodes: [], linkedNodes: {} } },
      },
    }
    const out = cloneNodeTree(tree, counterGen())
    expect(out.nodes['new-2'].data.parent).toBe('new-1')
  })

  it("rewrites nodes[] child refs in DOM order", () => {
    const tree = {
      rootNodeId: 'r',
      nodes: {
        r: { data: { parent: null, nodes: ['c1', 'c2'], linkedNodes: {} } },
        c1: { data: { parent: 'r', nodes: [], linkedNodes: {} } },
        c2: { data: { parent: 'r', nodes: [], linkedNodes: {} } },
      },
    }
    const out = cloneNodeTree(tree, counterGen())
    expect(out.nodes['new-1'].data.nodes).toEqual(['new-2', 'new-3'])
  })

  it('rewrites linkedNodes entries (Pattern B multi-canvas)', () => {
    const tree = {
      rootNodeId: 'card',
      nodes: {
        card: {
          data: {
            parent: null,
            nodes: [],
            linkedNodes: { header: 'h', body: 'b' },
          },
        },
        h: { data: { parent: 'card', nodes: [], linkedNodes: {} } },
        b: { data: { parent: 'card', nodes: [], linkedNodes: {} } },
      },
    }
    const out = cloneNodeTree(tree, counterGen())
    expect(out.nodes['new-1'].data.linkedNodes).toEqual({
      header: 'new-2',
      body: 'new-3',
    })
  })

  it('preserves user props verbatim', () => {
    const tree = {
      rootNodeId: 'a',
      nodes: {
        a: {
          data: {
            parent: null,
            nodes: [],
            linkedNodes: {},
            displayName: 'Button',
            props: { label: 'Click me', intent: 'primary' },
          },
        },
      },
    }
    const out = cloneNodeTree(tree, counterGen())
    expect(out.nodes['new-1'].data.displayName).toBe('Button')
    expect(out.nodes['new-1'].data.props).toEqual({
      label: 'Click me',
      intent: 'primary',
    })
  })

  it('preserves non-data fields (e.g. dom, events)', () => {
    const tree = {
      rootNodeId: 'a',
      nodes: {
        a: {
          data: { parent: null, nodes: [], linkedNodes: {} },
          events: { selected: false, hovered: false, dragged: false },
        },
      },
    }
    const out = cloneNodeTree(tree, counterGen())
    expect(out.nodes['new-1'].events).toEqual({
      selected: false,
      hovered: false,
      dragged: false,
    })
  })

  it('produces unique ids when called twice', () => {
    const tree = {
      rootNodeId: 'a',
      nodes: { a: { data: { parent: null, nodes: [], linkedNodes: {} } } },
    }
    // Default id generator uses Math.random — exceedingly unlikely to
    // collide across two calls.
    const a = cloneNodeTree(tree)
    const b = cloneNodeTree(tree)
    expect(a.rootNodeId).not.toBe(b.rootNodeId)
  })

  it('handles a deep tree without losing structural integrity', () => {
    const tree = {
      rootNodeId: 'a',
      nodes: {
        a: { data: { parent: null, nodes: ['b'], linkedNodes: {} } },
        b: { data: { parent: 'a', nodes: ['c'], linkedNodes: {} } },
        c: { data: { parent: 'b', nodes: ['d'], linkedNodes: {} } },
        d: { data: { parent: 'c', nodes: [], linkedNodes: {} } },
      },
    }
    const out = cloneNodeTree(tree, counterGen())
    // Every parent ref points at an id that exists in the new tree.
    for (const id of Object.keys(out.nodes)) {
      const parent = out.nodes[id].data.parent
      if (parent !== null) {
        expect(out.nodes).toHaveProperty(parent)
      }
    }
    // Every child ref points at an id that exists.
    for (const id of Object.keys(out.nodes)) {
      for (const childId of out.nodes[id].data.nodes) {
        expect(out.nodes).toHaveProperty(childId)
      }
    }
  })
})
