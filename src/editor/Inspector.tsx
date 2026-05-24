import { useEditor } from '@craftjs/core'
import { useEffect, useState } from 'react'
import { getComponentByDisplayName } from '@/registry/registry'
import { getPanelsFor } from './inspector/panel-registry'
import { ResizeToggle } from './inspector/ResizeToggle'
import { ResponsiveBar } from './inspector/ResponsiveBar'
import { SlotPicker } from './inspector/SlotPicker'
import { CollapsibleSection } from './inspector/shared/CollapsibleSection'

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
  // Phase 6 — panels come from the inspector panel registry. Built-ins
  // register themselves via src/editor/inspector/built-in-panels.ts; SDK
  // consumers can registerPanel() to add custom ones.
  const panels = def ? getPanelsFor(def) : []
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
              <ResizeToggle nodeId={selected.id} />
            </div>

            <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
              {panels.map((panel) => (
                <CollapsibleSection key={panel.id} title={panel.displayName}>
                  <panel.component nodeId={selected.id} slot={slot} />
                </CollapsibleSection>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
