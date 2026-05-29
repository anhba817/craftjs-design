import { describe, expect, it } from 'vitest'
import '@/registry/components'
import { getComponent } from '../registry'

// Phase 13 § 5.3 — registration smoke tests for the overlay group.
describe('Group D overlays canonicals are registered', () => {
  const cases: Array<{ id: string; isCanvas: boolean }> = [
    { id: 'modal', isCanvas: true },
    { id: 'drawer', isCanvas: true },
    { id: 'toast', isCanvas: false },
    // Tooltip body is a string prop, not droppable children.
    { id: 'tooltip', isCanvas: false },
    // Popover body is droppable rich content.
    { id: 'popover', isCanvas: true },
  ]

  for (const c of cases) {
    it(`${c.id} is registered with the expected shape`, () => {
      const def = getComponent(c.id)
      expect(def).toBeDefined()
      expect(def?.category).toBe('feedback')
      expect(def?.isCanvas).toBe(c.isCanvas)
      expect(def?.canResize).toBe(false)
      // Phase 13 § 5.3 — every overlay is hidden from the toolbox; the
      // only path is right-click "Attach overlay" on a triggerable
      // component.
      expect(def?.hidden, `${c.id}.hidden`).toBe(true)
      expect(() => def?.propsSchema.parse(def?.defaults.props)).not.toThrow()
    })
  }

  it('modal/drawer have size enums', () => {
    const modal = getComponent('modal')
    const drawer = getComponent('drawer')
    expect((modal?.defaults.props as { size: string }).size).toBeTruthy()
    expect((drawer?.defaults.props as { side: string }).side).toBeTruthy()
  })

  it('runtime-triggered overlays seed name + defaultOpen', () => {
    type RuntimeDefaults = { name: string; defaultOpen: boolean }
    for (const id of ['modal', 'drawer', 'toast', 'alert']) {
      const p = getComponent(id)?.defaults.props as RuntimeDefaults
      expect(p.name, `${id}.name`).toBeTruthy()
      expect(typeof p.defaultOpen, `${id}.defaultOpen`).toBe('boolean')
    }
    expect((getComponent('alert')?.defaults.props as RuntimeDefaults).defaultOpen).toBe(true)
    expect((getComponent('modal')?.defaults.props as RuntimeDefaults).defaultOpen).toBe(false)
    expect((getComponent('drawer')?.defaults.props as RuntimeDefaults).defaultOpen).toBe(false)
    expect((getComponent('toast')?.defaults.props as RuntimeDefaults).defaultOpen).toBe(false)
  })

  it('wrap-style overlays (tooltip, popover) seed a name', () => {
    for (const id of ['tooltip', 'popover']) {
      const p = getComponent(id)?.defaults.props as { name?: string }
      expect(p.name, `${id}.name`).toBeTruthy()
    }
  })

  it('alert stays visible in the toolbox (banner-style, not an attach target)', () => {
    const def = getComponent('alert')
    expect(def?.hidden).not.toBe(true)
  })

  it('triggerable canonicals carry a triggers array (hidden from PropsPanel)', () => {
    // Phase 13 § 5.3 — Button + 7 canonicals from § 5.3 round 3 each
    // declare `triggers: string[]` and hide that field from the auto-
    // generated PropsPanel (the OverlayTriggers panel renders a proper
    // checklist instead).
    const ids = [
      'button',
      'icon',
      'avatar',
      'badge',
      'image',
      'link',
      'nav-item',
      'card',
    ]
    for (const id of ids) {
      const def = getComponent(id)
      const triggers = (def?.defaults.props as { triggers?: unknown }).triggers
      expect(Array.isArray(triggers), `${id}.defaults.triggers is array`).toBe(true)
      expect(def?.hiddenPropFields, `${id}.hiddenPropFields`).toContain('triggers')
    }
    // Canonicals that declare an applicablePanels whitelist must include
    // overlayTriggers explicitly so the panel renders for them.
    for (const id of ['button', 'badge']) {
      const def = getComponent(id)
      expect(def?.applicablePanels, `${id}.applicablePanels`).toContain('overlayTriggers')
    }
  })
})
