import { Editor as Craft, Element, Frame } from '@craftjs/core'
import { useEffect } from 'react'
import { AdapterProvider } from '../adapters/AdapterContext'
import { getResolver } from '../craft/resolver'
import { getStorageUsage } from '../persistence/documentRegistry'
import { _markEditorMounted, getComponent } from '../registry/registry'
import { useEditorStore } from '../state/editorStore'
import { ThemeProvider } from '../themes/ThemeProvider'
import { CanvasKeyboardRegion } from './canvas/CanvasKeyboardRegion'
import { ResizeOverlay } from './canvas/ResizeOverlay'
import { NodeContextMenu } from './clipboard/NodeContextMenu'
import { useClipboardKeyboard } from './clipboard/useClipboardKeyboard'
import { useMultiSelectClick } from './selection/useMultiSelectClick'
import { useSelectionSync } from './selection/useSelectionSync'
import { AsyncErrorBanner } from './errors/AsyncErrorBanner'
import { ErrorBoundary } from './errors/ErrorBoundary'
import { MalformedDocumentBanner } from './errors/MalformedDocumentBanner'
import {
  CanvasErrorFallback,
  ToolboxErrorFallback,
  TopShellErrorFallback,
} from './errors/fallbacks'
import { Hydrator } from './Hydrator'
import { Inspector } from './Inspector'
import { ConcurrentEditBanner } from './persistence/ConcurrentEditBanner'
import { useConcurrentEditWatcher } from './persistence/concurrentEditWatcher'
import { StorageQuotaBanner } from './persistence/StorageQuotaBanner'
import { StorageQuotaErrorModal } from './persistence/StorageQuotaErrorModal'
import { ResolverUpdater } from './ResolverUpdater'
import { SaveLoadBar } from './SaveLoadBar'
import { Toolbox } from './Toolbox'

export function Editor() {
  // Phase 6 — flip the registry's post-mount flag so any registerCanonical
  // calls after this point warn instead of silently failing to appear.
  useEffect(() => {
    _markEditorMounted()
  }, [])

  // Phase 9 § 1.7 — seed the storage quota percent on mount so the
  // banner reflects the actual state from the start. Subsequent writes
  // update this via documentStore.reportWrite().
  useEffect(() => {
    const usage = getStorageUsage()
    useEditorStore.getState().setStorageQuotaPercent(usage.percent)
  }, [])

  const resolver = getResolver()
  const boxDef = getComponent('box')
  if (!boxDef) {
    throw new Error(
      'canonical "box" must be registered before <Editor /> mounts — check side-effect imports in App.tsx',
    )
  }
  const Root = resolver[boxDef.displayName]
  // Phase 9 § 1.9 — when applyEnvelopeSafely detects a structural or
  // deserialize failure, Frame is swapped for MalformedDocumentBanner
  // so the user has a recovery path instead of a half-loaded canvas.
  const malformedDocument = useEditorStore((s) => s.malformedDocument)

  // Phase 8 — three boundary layers below the top shell. The outermost
  // (TopShellErrorFallback) is mounted by App.tsx so it catches anything
  // that bubbles out of <Editor /> itself, including a thrown getResolver()
  // or AdapterProvider failure. Inner boundaries (Canvas, Toolbox) handle
  // localized failures so the rest of the editor stays alive.
  return (
    <AdapterProvider>
      <Craft resolver={resolver}>
        <Hydrator />
        <ResolverUpdater />
        <ResizeOverlay />
        {/* Phase 9 § 1.6 — toast for uncaught async errors (effects,
            event handlers, fetch promises) that the React render-path
            ErrorBoundaries don't see. Critical async failures
            (Hydrator deserialize) still bubble to a boundary; this
            handles everything else. */}
        <AsyncErrorBanner />
        {/* Phase 9 § 1.7 — blocking modal when localStorage save fails
            with QuotaExceededError. */}
        <StorageQuotaErrorModal />
        <div className="flex h-screen flex-col">
          <SaveLoadBar />
          {/* Phase 9 § 1.7 — non-blocking warning when usage ≥ 80%. */}
          <StorageQuotaBanner />
          {/* Phase 9 § 1.8 — cross-tab edit detected; user picks which
              version wins. */}
          <ConcurrentEditBanner />
          <ConcurrentEditWatcherMount />
          {/* Phase 11 § 3.2 — global Cmd+C/X/V/D clipboard shortcuts. */}
          <ClipboardKeyboardMount />
          {/* Phase 11 § 3.3 — mirror Craft's events.selected into
              editorStore.selection so the Inspector / breadcrumbs /
              multi-delete can subscribe via the standard zustand
              selector pattern. */}
          <SelectionSyncMount />
          {/* Phase 11 § 3.3 — capture-phase mousedown listener that
              implements Cmd/Ctrl-click toggle and Shift-click range
              before Craft's default connector overwrites selection. */}
          <MultiSelectClickMount />
          <div className="flex min-h-0 flex-1">
            <ErrorBoundary fallback={ToolboxErrorFallback}>
              <Toolbox />
            </ErrorBoundary>
            <ThemeProvider>
              <main className="flex-1 overflow-auto bg-muted p-8">
                <ErrorBoundary fallback={CanvasErrorFallback}>
                  {malformedDocument ? (
                    <MalformedDocumentBanner />
                  ) : (
                    <NodeContextMenu>
                      <CanvasKeyboardRegion>
                        <Frame>
                          <Element
                            is={Root}
                            canvas
                            nodeProps={boxDef.defaults.props}
                            style={boxDef.defaults.style}
                          />
                        </Frame>
                      </CanvasKeyboardRegion>
                    </NodeContextMenu>
                  )}
                </ErrorBoundary>
              </main>
            </ThemeProvider>
            <Inspector />
          </div>
        </div>
      </Craft>
    </AdapterProvider>
  )
}

// Re-export for App.tsx to wrap the entire editor in a top-shell boundary.
export { ErrorBoundary, TopShellErrorFallback }

// Tiny inert host for the storage-event listener. The watcher hook can't
// live directly in <Editor /> because that component renders <Craft>,
// which holds the editor context the watcher's siblings consume —
// rendering it as a child of <Craft> would invert the order. Keeping it
// here as a no-op component is the simplest fix.
function ConcurrentEditWatcherMount() {
  useConcurrentEditWatcher()
  return null
}

// Phase 11 § 3.2 — global keyboard listener for Cmd+C / X / V / D.
// Same mount-host pattern as above so the hook can use useEditor's
// context without inverting the tree.
function ClipboardKeyboardMount() {
  useClipboardKeyboard()
  return null
}

// Phase 11 § 3.3 — keeps editorStore.selection in sync with Craft's
// events.selected. Same mount-host pattern: must be a child of <Craft>
// to access the editor context.
function SelectionSyncMount() {
  useSelectionSync()
  return null
}

// Phase 11 § 3.3 — modifier-click multi-select listener. Capture-phase
// document handler that runs before Craft's connector mousedown.
function MultiSelectClickMount() {
  useMultiSelectClick()
  return null
}
