import { useEditor } from '@craftjs/core'
import { useEffect, useState } from 'react'
import { getComponentByDisplayName } from '@/registry/registry'
import { useEditorStore } from '@/state/editorStore'
import { useEditorImageProvider } from './assets/EditorImageProvider'
import { ErrorBoundary } from './errors/ErrorBoundary'
import { PanelErrorFallback } from './errors/fallbacks'
import { InspectorBreadcrumbs } from './inspector/InspectorBreadcrumbs'
import { getPanelsFor } from './inspector/panel-registry'
import { ResponsiveBar } from './inspector/ResponsiveBar'
import { SlotPicker } from './inspector/SlotPicker'
import { CollapsibleSection } from './inspector/shared/CollapsibleSection'

export function Inspector() {
  // Phase 11 § 3.3 — Inspector reads selection from editorStore (the
  // multi-id source of truth) rather than from Craft directly. See
  // useSelectionSync for the mirror.
  const selection = useEditorStore((s) => s.selection)
  // Collect PRIMITIVES (not a nested {primary} object). Craft's
  // `shallowequal` would otherwise see a fresh nested object on
  // every state change and re-render Inspector — including all
  // panels — on every selectNode, even when nothing relevant to
  // the displayed node changed. Returning primitives lets
  // shallowEqual short-circuit when the selected id / name /
  // isRoot are stable. Keyboard nav perf depends on this.
  const { primaryId, primaryDisplayName, primaryIsRoot, actions } = useEditor(
    (_state, query) => {
      const id = selection[0]
      if (!id) {
        return {
          primaryId: null as string | null,
          primaryDisplayName: null as string | null,
          primaryIsRoot: false,
        }
      }
      try {
        const node = query.node(id).get()
        return {
          primaryId: id,
          primaryDisplayName: (node.data.displayName as string) ?? null,
          primaryIsRoot: query.node(id).isRoot(),
        }
      } catch {
        // Race: node deleted between selection set and this render.
        return {
          primaryId: null as string | null,
          primaryDisplayName: null as string | null,
          primaryIsRoot: false,
        }
      }
    },
  )
  const primary = primaryId
    ? { id: primaryId, displayName: primaryDisplayName ?? primaryId }
    : null

  const isMulti = selection.length > 1

  const def = primary ? getComponentByDisplayName(primary.displayName) : null
  // Phase 6 — panels come from the inspector panel registry. Built-ins
  // register themselves via src/editor/inspector/built-in-panels.ts; SDK
  // consumers can registerPanel() to add custom ones.
  // Phase 11 § 3.3 — in multi-mode, the per-canonical Properties panel
  // (`componentProps`) is hidden because props don't merge sensibly
  // across different canonical types. Style panels stay and use
  // useNodeClassesMulti via the multi variant.
  // Phase 11 § 3.10 — the asset-library panel is only useful when the
  // active image provider can list assets (host-supplied backend).
  // The panel's applicableTo can't read context, so gate it here:
  // the Inspector calls the provider hook unconditionally and filters
  // 'assetLibrary' out when canList is false (the default base64
  // provider).
  const imageProviderCanList = useEditorImageProvider().canList
  const allPanels = def ? getPanelsFor(def) : []
  const panels = allPanels.filter((p) => {
    if (isMulti && p.id === 'componentProps') return false
    if (p.id === 'assetLibrary' && !imageProviderCanList) return false
    return true
  })
  const slots = def?.styleSlots ?? ['root']

  // Slot state is per-selection — resets to the first slot when the user
  // selects a different node. Kept here in component state rather than
  // editorStore because it's transient UI, not document- or app-level.
  const [activeSlot, setActiveSlot] = useState<string>(slots[0])
  useEffect(() => {
    setActiveSlot(slots[0])
  }, [primary?.id, slots])

  // Defensive: if slots changed (rare — only on canonical-def hot-reload), the
  // active slot might no longer exist. Snap back to the first slot.
  const slot = slots.includes(activeSlot) ? activeSlot : slots[0]
  const showSlotPicker = slots.length > 1

  return (
    <aside
      aria-label="Inspector"
      data-onboarding-target="inspector"
      className="flex w-72 flex-col border-l border-gray-200"
    >
      <div className="px-3 py-2 text-xs font-semibold tracking-wide uppercase text-gray-500">
        Inspector
      </div>
      {!primary ? (
        <div className="px-3 text-xs text-gray-500">Nothing selected.</div>
      ) : (
        <>
          <InspectorBreadcrumbs />
          <ResponsiveBar />
          {showSlotPicker && (
            <SlotPicker slots={slots} active={slot} onChange={setActiveSlot} />
          )}
          <div className="overflow-x-hidden overflow-y-auto px-3 py-3">
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-gray-500">Type</div>
                <div className="font-medium text-gray-800">
                  {isMulti ? `Multiple (${selection.length})` : primary.displayName}
                </div>
              </div>
              {!isMulti && (
                <div>
                  <div className="text-xs text-gray-500">Id</div>
                  <code className="text-xs text-gray-700">{primary.id}</code>
                </div>
              )}
              {!primaryIsRoot && !isMulti && (
                <button
                  type="button"
                  className="text-sm text-red-600 underline hover:text-red-700"
                  onClick={() => actions.delete(primary.id)}
                >
                  Delete
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
              {panels.map((panel) => (
                <CollapsibleSection key={panel.id} title={panel.displayName}>
                  {/* Phase 8 — each panel renders inside its own boundary so a
                      buggy custom panel doesn't drop the entire inspector. */}
                  <ErrorBoundary fallback={PanelErrorFallback}>
                    {/* Phase 11 § 3.3 — pass the full selection so panels
                        opting into multi-mode can merge values across
                        nodes. The PropsPanel ignores the second arg and
                        keeps using nodeId. */}
                    <panel.component
                      nodeId={primary.id}
                      nodeIds={selection}
                      slot={slot}
                    />
                  </ErrorBoundary>
                </CollapsibleSection>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
