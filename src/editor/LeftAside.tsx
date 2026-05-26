import { Layers, Package } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ErrorBoundary } from './errors/ErrorBoundary'
import { ToolboxErrorFallback } from './errors/fallbacks'
import { LayerTree } from './layers/LayerTree'
import { Toolbox } from './Toolbox'

// Phase 11 § 3.4 — host for the two left-aside surfaces (Components
// and Layers). A tab strip at the top toggles between them; the
// active tab persists in localStorage so reloads keep the user's
// last choice. Default = Components (matches pre-Phase-11 behavior
// for first-time users).
//
// Why localStorage instead of editorStore: per-tab UI state has no
// reason to be in the cross-tab persistence layer (zustand isn't
// persisted but is global to the editor instance), and migrating
// the value forward across editor versions is easier with a
// versioned localStorage key.

type LeftAsideTab = 'components' | 'layers'

const STORAGE_KEY = 'craftjs-design.left-aside-tab:v1'

function readPersistedTab(): LeftAsideTab {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'components' || raw === 'layers') return raw
  } catch {
    // localStorage disabled (private mode). Fall through to default.
  }
  return 'components'
}

function writePersistedTab(tab: LeftAsideTab) {
  try {
    localStorage.setItem(STORAGE_KEY, tab)
  } catch {
    // localStorage disabled or quota exceeded — non-fatal.
  }
}

export function LeftAside() {
  const [tab, setTab] = useState<LeftAsideTab>(() => readPersistedTab())

  useEffect(() => {
    writePersistedTab(tab)
  }, [tab])

  return (
    <aside
      aria-label="Components and layers"
      data-onboarding-target="toolbox"
      className="flex w-56 flex-col border-r border-gray-200"
    >
      <div
        role="tablist"
        aria-label="Sidebar mode"
        className="flex shrink-0 border-b border-gray-200"
      >
        <TabButton
          isActive={tab === 'components'}
          onClick={() => setTab('components')}
          icon={<Package size={12} aria-hidden />}
          label="Components"
          panelId="left-aside-components"
        />
        <TabButton
          isActive={tab === 'layers'}
          onClick={() => setTab('layers')}
          icon={<Layers size={12} aria-hidden />}
          label="Layers"
          panelId="left-aside-layers"
        />
      </div>
      {tab === 'components' ? (
        <div
          id="left-aside-components"
          role="tabpanel"
          aria-label="Components"
          className="flex min-h-0 flex-1 flex-col"
        >
          <ErrorBoundary fallback={ToolboxErrorFallback}>
            <Toolbox />
          </ErrorBoundary>
        </div>
      ) : (
        <div
          id="left-aside-layers"
          role="tabpanel"
          aria-label="Layers"
          className="flex min-h-0 flex-1 flex-col"
        >
          <ErrorBoundary fallback={ToolboxErrorFallback}>
            <LayerTree />
          </ErrorBoundary>
        </div>
      )}
    </aside>
  )
}

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
          ? 'border-b-2 border-primary text-primary'
          : 'border-b-2 border-transparent text-gray-500 hover:text-gray-800',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}
