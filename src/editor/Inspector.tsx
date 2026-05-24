import { useEditor } from '@craftjs/core'
import { useEffect, useState } from 'react'
import {
  getApplicablePanels,
  getComponentByDisplayName,
} from '@/registry/registry'
import { AppearancePanel } from './inspector/AppearancePanel'
import { EffectsPanel } from './inspector/EffectsPanel'
import { LayoutPanel } from './inspector/LayoutPanel'
import { PropsPanel } from './inspector/PropsPanel'
import { ResponsiveBar } from './inspector/ResponsiveBar'
import { SlotPicker } from './inspector/SlotPicker'
import { CollapsibleSection } from './inspector/shared/CollapsibleSection'
import { SizePanel } from './inspector/SizePanel'
import { SpacingPanel } from './inspector/SpacingPanel'
import { TypographyPanel } from './inspector/TypographyPanel'

export function Inspector() {
  const { selected, isRoot, actions } = useEditor((state, query) => {
    // `events.selected` is a Set in Craft.js 0.2.x — coerce defensively for
    // version-skew safety.
    const ids = state.events.selected ? Array.from(state.events.selected) : []
    const id = ids[0]
    if (!id) return { selected: null, isRoot: false }
    const node = query.node(id).get()
    return {
      selected: { id, displayName: node.data.displayName },
      isRoot: query.node(id).isRoot(),
    }
  })

  const def = selected ? getComponentByDisplayName(selected.displayName) : null
  const panels = def ? getApplicablePanels(def) : []
  const slots = def?.styleSlots ?? ['root']

  // Slot state is per-selection — resets to the first slot when the user
  // selects a different node. Kept here in component state rather than
  // editorStore because it's transient UI, not document- or app-level.
  const [activeSlot, setActiveSlot] = useState<string>(slots[0])
  useEffect(() => {
    setActiveSlot(slots[0])
  }, [selected?.id, slots])

  // Defensive: if slots changed (rare — only on canonical-def hot-reload), the
  // active slot might no longer exist. Snap back to the first slot.
  const slot = slots.includes(activeSlot) ? activeSlot : slots[0]
  const showSlotPicker = slots.length > 1

  return (
    <aside className="flex w-72 flex-col border-l border-gray-200">
      <div className="px-3 py-2 text-xs font-semibold tracking-wide uppercase text-gray-500">
        Inspector
      </div>
      {!selected ? (
        <div className="px-3 text-xs text-gray-400">Nothing selected.</div>
      ) : (
        <>
          <ResponsiveBar />
          {showSlotPicker && (
            <SlotPicker slots={slots} active={slot} onChange={setActiveSlot} />
          )}
          <div className="overflow-y-auto px-3 py-3">
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-gray-500">Type</div>
                <div className="font-medium text-gray-800">{selected.displayName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Id</div>
                <code className="text-xs text-gray-700">{selected.id}</code>
              </div>
              {!isRoot && (
                <button
                  type="button"
                  className="text-sm text-red-600 underline hover:text-red-700"
                  onClick={() => actions.delete(selected.id)}
                >
                  Delete
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
              {panels.includes('layout') && (
                <CollapsibleSection title="Layout">
                  <LayoutPanel nodeId={selected.id} slot={slot} />
                </CollapsibleSection>
              )}
              {panels.includes('size') && (
                <CollapsibleSection title="Size">
                  <SizePanel nodeId={selected.id} slot={slot} />
                </CollapsibleSection>
              )}
              {panels.includes('spacing') && (
                <CollapsibleSection title="Spacing">
                  <SpacingPanel nodeId={selected.id} slot={slot} />
                </CollapsibleSection>
              )}
              {panels.includes('typography') && (
                <CollapsibleSection title="Typography">
                  <TypographyPanel nodeId={selected.id} slot={slot} />
                </CollapsibleSection>
              )}
              {panels.includes('appearance') && (
                <CollapsibleSection title="Appearance">
                  <AppearancePanel nodeId={selected.id} slot={slot} />
                </CollapsibleSection>
              )}
              {panels.includes('effects') && (
                <CollapsibleSection title="Effects">
                  <EffectsPanel nodeId={selected.id} slot={slot} />
                </CollapsibleSection>
              )}
              {panels.includes('componentProps') && (
                <CollapsibleSection title="Properties">
                  {/* PropsPanel edits canonical props, not slot classes — slot doesn't apply. */}
                  <PropsPanel nodeId={selected.id} />
                </CollapsibleSection>
              )}
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
