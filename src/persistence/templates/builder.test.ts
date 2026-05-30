import { beforeAll, describe, expect, it } from 'vitest'
import { CURRENT_DOCUMENT_VERSION } from '../schema'
import { buildTemplate } from './builder'

// The builder needs the canonical registry populated. Register the canonicals
// once for the whole test file via the side-effect barrel.
beforeAll(async () => {
  await import('@/registry/components')
})

describe('buildTemplate', () => {
  it('wraps a single-canonical spec in a valid envelope', () => {
    const env = buildTemplate({ root: { canonical: 'box' } })
    expect(env.version).toBe(CURRENT_DOCUMENT_VERSION)
    expect(env.adapterId).toBe('shadcn')
    const tree = JSON.parse(env.craftJson)
    expect(tree.ROOT).toBeDefined()
    expect(tree.ROOT.displayName).toBe('Box')
    expect(tree.ROOT.parent).toBeNull()
  })

  it('preserves canonical defaults when no overrides are given', () => {
    const env = buildTemplate({
      root: {
        canonical: 'heading',
      },
    })
    const tree = JSON.parse(env.craftJson)
    // Heading's default props: { level: '2', content: 'Heading' }
    expect(tree.ROOT.props.nodeProps.level).toBe('2')
  })

  it('shallow-merges nodeProps overrides on top of defaults', () => {
    const env = buildTemplate({
      root: {
        canonical: 'heading',
        nodeProps: { content: 'Custom title' },
      },
    })
    const tree = JSON.parse(env.craftJson)
    expect(tree.ROOT.props.nodeProps.level).toBe('2') // default preserved
    expect(tree.ROOT.props.nodeProps.content).toBe('Custom title')
  })

  it('merges classes per-slot in style', () => {
    const env = buildTemplate({
      root: {
        canonical: 'box',
        style: { classes: { root: 'p-12 bg-card' } },
      },
    })
    const tree = JSON.parse(env.craftJson)
    expect(tree.ROOT.props.style.classes.root).toBe('p-12 bg-card')
  })

  it('emits children as separate nodes referenced by parent.nodes', () => {
    const env = buildTemplate({
      root: {
        canonical: 'box',
        children: [
          { canonical: 'text', nodeProps: { content: 'first' } },
          { canonical: 'text', nodeProps: { content: 'second' } },
        ],
      },
    })
    const tree = JSON.parse(env.craftJson)
    expect(tree.ROOT.nodes).toHaveLength(2)
    const [child1, child2] = tree.ROOT.nodes.map((id: string) => tree[id])
    expect(child1.parent).toBe('ROOT')
    expect(child1.props.nodeProps.content).toBe('first')
    expect(child2.props.nodeProps.content).toBe('second')
  })

  it('skips children on non-canvas canonicals', () => {
    const env = buildTemplate({
      root: {
        canonical: 'button',
        // Button is a leaf — children are ignored.
        children: [{ canonical: 'text' }],
      },
    })
    const tree = JSON.parse(env.craftJson)
    expect(tree.ROOT.nodes).toEqual([])
  })

  it('throws on unknown canonical ids', () => {
    expect(() =>
      buildTemplate({ root: { canonical: 'not-a-real-canonical' } }),
    ).toThrow(/unknown canonical/)
  })

  it('produces deterministic ids', () => {
    const a = buildTemplate({
      root: { canonical: 'box', children: [{ canonical: 'text' }] },
    })
    const b = buildTemplate({
      root: { canonical: 'box', children: [{ canonical: 'text' }] },
    })
    expect(a.craftJson).toBe(b.craftJson)
  })
})
