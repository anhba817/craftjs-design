import { Layers2, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useEditorStore } from '@/state/editorStore'
import { InspectorBody } from './Inspector'
import { OverlayStageBody } from './OverlayStage'

// Phase 25 (Decision 2) — the right panel, tabified at ALL sizes. Replaces the
// two always-on docked columns (Inspector + OverlayStage) with one column that
// switches between a "Properties" tab and an "Overlays" tab — the same pattern
// LeftAside uses for Components / Layers. Reclaims the ~320px the always-on
// (and usually empty) overlay stage wasted.
//
// BOTH bodies stay mounted; the inactive one is `hidden` (display:none), not
// unmounted — because `#craftjs-overlay-stage` (inside OverlayStageBody) is the
// portal target overlays render their edit-mode preview into, and must exist in
// the DOM regardless of which tab is showing.

type RightTab = 'properties' | 'overlays'

function TabButton({
  isActive,
  onClick,
  icon,
  label,
  panelId,
}: {
  isActive: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  panelId: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={panelId}
      onClick={onClick}
      className={[
        'flex h-8 flex-1 items-center justify-center gap-1.5 text-[11px] font-medium tracking-wide uppercase transition-colors',
        isActive
          ? 'border-b-2 border-ed-accent text-ed-accent'
          : 'border-b-2 border-transparent text-ed-text-muted hover:text-ed-text-strong',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}

export function RightPanel() {
  const [tab, setTab] = useState<RightTab>('properties')

  // Selecting a node surfaces the Properties tab (mirrors the old behavior
  // where the inspector was always visible). Subscribe to the primary
  // selection id; a separate store read, decoupled from the flushSync
  // selection-sync write (so it can't perturb selection latency).
  const primaryId = useEditorStore((s) => s.selection[0] ?? null)
  useEffect(() => {
    if (primaryId) setTab('properties')
  }, [primaryId])

  return (
    <aside
      aria-label="Inspector"
      data-onboarding-target="inspector"
      className="flex w-72 flex-col border-l border-ed-border"
    >
      <div role="tablist" aria-label="Right panel" className="flex shrink-0 border-b border-ed-border">
        <TabButton
          isActive={tab === 'properties'}
          onClick={() => setTab('properties')}
          icon={<SlidersHorizontal size={12} aria-hidden />}
          label="Properties"
          panelId="right-panel-properties"
        />
        <TabButton
          isActive={tab === 'overlays'}
          onClick={() => setTab('overlays')}
          icon={<Layers2 size={12} aria-hidden />}
          label="Overlays"
          panelId="right-panel-overlays"
        />
      </div>
      {/* Both bodies mounted; inactive is display:none so the overlay-stage
          portal target stays in the DOM. */}
      <div
        id="right-panel-properties"
        role="tabpanel"
        aria-label="Properties"
        className={tab === 'properties' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
      >
        <InspectorBody />
      </div>
      <div
        id="right-panel-overlays"
        role="tabpanel"
        aria-label="Overlays"
        className={tab === 'overlays' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
      >
        <OverlayStageBody />
      </div>
    </aside>
  )
}
