import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { CanonicalComponent, NodeStyle } from '../registry/types'
import { buildNodeRenderModel } from './nodeRenderModel'

// Phase 18 § 3 — buildNodeRenderModel is a pure function, so unlike
// CanonicalNode (which needs Craft + an adapter + a DOM) it's directly
// unit-testable. These pin the composition behavior that was previously only
// smoke-verified through the rendered editor.

function makeDef(
  overrides: Partial<CanonicalComponent> = {},
): CanonicalComponent {
  return {
    id: 'test',
    category: 'layout',
    displayName: 'Test',
    tags: [],
    isCanvas: false,
    styleSlots: ['root'],
    propsSchema: z.object({}),
    defaults: { props: {}, style: { classes: {} } },
    ...overrides,
  } as CanonicalComponent
}

const tokens = (s: string) => s.split(/\s+/).filter(Boolean)

describe('buildNodeRenderModel — class composition', () => {
  it('composes the root slot from style.classes', () => {
    const def = makeDef({ styleSlots: ['root'] })
    const style: NodeStyle = { classes: { root: 'p-4 bg-card' } }
    const m = buildNodeRenderModel(def, {}, style, null)
    expect(tokens(m.composedClasses.root)).toEqual(
      expect.arrayContaining(['p-4', 'bg-card']),
    )
    expect(m.rootClassString).toBe(m.composedClasses.root)
  })

  it('composes every declared styleSlot independently', () => {
    const def = makeDef({ styleSlots: ['root', 'header', 'body'] })
    const style: NodeStyle = {
      classes: { root: 'rounded', header: 'font-bold', body: 'text-sm' },
    }
    const m = buildNodeRenderModel(def, {}, style, null)
    expect(Object.keys(m.composedClasses).sort()).toEqual([
      'body',
      'header',
      'root',
    ])
    expect(tokens(m.composedClasses.header)).toContain('font-bold')
    expect(tokens(m.composedClasses.body)).toContain('text-sm')
  })

  it('an empty style yields empty slot strings, not undefined', () => {
    const def = makeDef({ styleSlots: ['root'] })
    const m = buildNodeRenderModel(def, {}, { classes: {} }, null)
    expect(m.composedClasses.root).toBe('')
    expect(m.rootClassString).toBe('')
  })
})

describe('buildNodeRenderModel — canvas slot metadata', () => {
  it('leaf (isCanvas false, no canvasSlots): no drop zones', () => {
    const m = buildNodeRenderModel(makeDef(), {}, { classes: {} }, null)
    expect(m.canvasSlots).toEqual([])
    expect(m.usesSlotChildren).toBe(false)
  })

  it('single-canvas Pattern A (isCanvas true): one root drop zone', () => {
    const def = makeDef({ isCanvas: true })
    const m = buildNodeRenderModel(def, {}, { classes: {} }, null)
    expect(m.canvasSlots).toEqual(['root'])
    expect(m.usesSlotChildren).toBe(false) // children, not slotChildren
  })

  it('static multi-canvas (Card-style): one slot per named region', () => {
    const def = makeDef({
      styleSlots: ['root', 'header', 'body', 'footer'],
      canvasSlots: ['header', 'body', 'footer'],
    })
    const m = buildNodeRenderModel(def, {}, { classes: {} }, null)
    expect(m.canvasSlots).toEqual(['header', 'body', 'footer'])
    expect(m.usesSlotChildren).toBe(true)
  })

  it('dynamic multi-canvas (Tabs-style): slots derived from props', () => {
    const def = makeDef({
      canvasSlots: (p: { tabs: { id: string }[] }) =>
        p.tabs.map((t) => `tab-${t.id}`),
    })
    const m = buildNodeRenderModel(
      def,
      { tabs: [{ id: 'a' }, { id: 'b' }] },
      { classes: {} },
      null,
    )
    expect(m.canvasSlots).toEqual(['tab-a', 'tab-b'])
    expect(m.usesSlotChildren).toBe(true)
  })
})

describe('buildNodeRenderModel — pseudo-state preview', () => {
  const def = makeDef({ styleSlots: ['root'] })
  const style: NodeStyle = {
    classes: { root: 'p-4' },
    states: { hover: { root: 'bg-primary' } },
  }

  it('overlays the edited state bucket UNPREFIXED when previewing', () => {
    const m = buildNodeRenderModel(def, {}, style, {
      bp: 'base',
      state: 'hover',
    })
    expect(tokens(m.composedClasses.root)).toContain('bg-primary')
  })

  it('does not overlay the bare state token without a preview bucket', () => {
    const m = buildNodeRenderModel(def, {}, style, null)
    // The base composition may carry the prefixed `hover:bg-primary`, but never
    // the bare `bg-primary` token — that only appears while previewing.
    expect(tokens(m.composedClasses.root)).not.toContain('bg-primary')
  })
})
