import { Editor as Craft, Element, Frame } from '@craftjs/core'
import { Loader2 } from 'lucide-react'
import { useEffect, useLayoutEffect } from 'react'
import { AdapterProvider, getAdapter } from '../adapters/AdapterContext'
import { getResolver } from '../craft/resolver'
import {
  bootstrapDocumentStore,
  useDocumentStore,
} from '../persistence/documentStore'
import { _markEditorMounted, getComponent } from '../registry/registry'
import { useEditorStore } from '../state/editorStore'
import { ThemeProvider } from '../themes/ThemeProvider'
import { CanvasKeyboardRegion } from './canvas/CanvasKeyboardRegion'
import { ResizeOverlay } from './canvas/ResizeOverlay'
import { SecondarySelectionOutlines } from './canvas/SecondarySelectionOutlines'
import { CanvasSearch } from './discoverability/CanvasSearch'
import { EmptyCanvasHint } from './discoverability/EmptyCanvasHint'
import { OnboardingTour } from './discoverability/OnboardingTour'
import { GuideOverlay } from './guides/GuideOverlay'
import { NodeContextMenu } from './clipboard/NodeContextMenu'
import { useClipboardKeyboard } from './clipboard/useClipboardKeyboard'
import { useMultiSelectClick } from './selection/useMultiSelectClick'
import { useSelectionSync } from './selection/useSelectionSync'
import { AsyncErrorBanner } from './errors/AsyncErrorBanner'
import { ErrorBoundary } from './errors/ErrorBoundary'
import { MalformedDocumentBanner } from './errors/MalformedDocumentBanner'
import {
  CanvasErrorFallback,
  TopShellErrorFallback,
} from './errors/fallbacks'
import { Hydrator } from './Hydrator'
import { Inspector } from './Inspector'
import { LeftAside } from './LeftAside'
import { OverlayStage } from './OverlayStage'
import { ConcurrentEditBanner } from './persistence/ConcurrentEditBanner'
import { useConcurrentEditWatcher } from './persistence/concurrentEditWatcher'
import { StorageQuotaBanner } from './persistence/StorageQuotaBanner'
import { StorageQuotaErrorModal } from './persistence/StorageQuotaErrorModal'
import { ResolverUpdater } from './ResolverUpdater'
import { SaveLoadBar } from './SaveLoadBar'

// Phase 18 follow-up — host-level adapter policy. The product intent is that
// the HOST picks the design system; end users of the host don't.
export interface EditorProps {
  /**
   * Host-chosen adapter id (`'shadcn' | 'mui' | 'html'` or a custom adapter's
   * id). Applied before first paint. The adapter must be REGISTERED — import
   * its subpath (e.g. `@crafted-design/editor/adapters/mui`) before rendering,
   * and for MUI install the optional peers: `@mui/material`,
   * `@emotion/react`, `@emotion/styled` (the full `@crafted-design/editor`
   * entry registers MUI and therefore also needs them). An unregistered id
   * warns and falls back to the default (`shadcn`).
   */
  adapter?: string
  /**
   * Whether end users may switch adapters via the toolbar dropdown.
   * Defaults to `false` when `adapter` is set (the host pinned it) and `true`
   * otherwise (back-compat). When `false`, the AdapterSwitcher is hidden and
   * loading a document does NOT override the active adapter — the envelope's
   * `adapterId` is a preference, not a command (documents are canonical-id
   * based, so they render under whichever adapter the host chose).
   */
  allowUserToSwitchAdapter?: boolean
}

export function Editor({ adapter, allowUserToSwitchAdapter }: EditorProps = {}) {
  // Phase 6 — flip the registry's post-mount flag so any registerCanonical
  // calls after this point warn instead of silently failing to appear.
  useEffect(() => {
    _markEditorMounted()
  }, [])

  // Apply the host's adapter policy before first paint (layout effect — no
  // visible flash; an adapter swap is safe by design, the wrapper tree stays
  // stable). Re-applies if the host changes the props.
  const allowSwitch = allowUserToSwitchAdapter ?? adapter === undefined
  useLayoutEffect(() => {
    const store = useEditorStore.getState()
    if (adapter) {
      if (getAdapter(adapter)) {
        store.setActiveAdapter(adapter)
      } else {
        console.warn(
          `[Editor] adapter "${adapter}" is not registered — falling back to the default. ` +
            `Import its subpath before rendering <Editor /> (e.g. ` +
            `import '@crafted-design/editor/adapters/${adapter}')` +
            (adapter === 'mui'
              ? ` and install the MUI peers: npm install @mui/material @emotion/react @emotion/styled`
              : '') +
            `.`,
        )
      }
    }
    store.setAllowAdapterSwitch(allowSwitch)
  }, [adapter, allowSwitch])

  // Phase 14 § 6.2 — bootstrap the async document store on mount: runs the
  // adapter's one-time init (legacy migration / IDB import), reads the index,
  // flips `ready`, and seeds the storage-quota percent. Hydrator waits on
  // `ready` before applying the active document.
  useEffect(() => {
    void bootstrapDocumentStore()
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
        {/* Phase 11 § 3.3 — dashed outlines for every non-primary
            selection so multi-select is visible on the canvas. The
            ResizeOverlay only renders for the primary (it owns the
            8 handles too). */}
        <SecondarySelectionOutlines />
        {/* Phase 11 § 3.6 — Figma-style alignment guides during
            HTML5 drag. Visual-only for v1; Craft still commits the
            move via insertion-index on dragend. */}
        <GuideOverlay />
        {/* Phase 11 § 3.9 — Cmd/Ctrl+F canvas search overlay. */}
        <CanvasSearch />
        {/* Phase 11 § 3.8 — first-load onboarding tour. Reads/writes
            the completion flag in localStorage; the document menu's
            "Show tour again" entry replays it. */}
        <OnboardingTour />
        {/* Phase 9 § 1.6 — toast for uncaught async errors (effects,
            event handlers, fetch promises) that the React render-path
            ErrorBoundaries don't see. Critical async failures
            (Hydrator deserialize) still bubble to a boundary; this
            handles everything else. */}
        <AsyncErrorBanner />
        {/* Phase 9 § 1.7 — blocking modal when localStorage save fails
            with QuotaExceededError. */}
        <StorageQuotaErrorModal />
        {/* Phase 19 — `cd-editor-chrome` + data-editor-theme scope the
            editor-chrome theme tokens (--ed-*). Light defaults live on
            :root (so portaled chrome inherits them); this attribute is
            where presets/host token maps apply (dynamic in Group C).
            NOTE for Group C: sibling overlays above (ResizeOverlay,
            banners, modals) render outside this div — non-default themes
            must cover them too. */}
        <div
          className="cd-editor-chrome flex h-screen flex-col"
          data-editor-theme="light"
        >
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
            {/* Phase 11 § 3.4 — left aside hosts both Components and
                Layers tabs. Per-tab ErrorBoundaries live inside
                LeftAside so a buggy LayerTree doesn't drop the
                toolbox. */}
            <LeftAside />
            <ThemeProvider>
              <main
                data-onboarding-target="canvas"
                className="relative flex-1 overflow-auto bg-muted p-8"
              >
                <ErrorBoundary fallback={CanvasErrorFallback} boundary="canvas">
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
                  {/* Phase 11 § 3.7 — first-load hint when ROOT
                      is empty. Absolute-positioned over the canvas;
                      pointer-events-none on the outer wrapper so
                      drops still hit the Frame underneath. */}
                  {!malformedDocument && <EmptyCanvasHint />}
                  {/* Phase 14 § 6.2 — cover the canvas while the async
                      document bootstrap is in flight so the user doesn't
                      see / interact with the pre-hydration seed. */}
                  <DocumentLoadingOverlay />
                </ErrorBoundary>
              </main>
            </ThemeProvider>
            {/* Phase 13 § 5.3 — Modals / Drawers / Toasts / Tooltips /
                Popovers portal here in editing mode (via the
                `craftjs-overlay-stage` div inside) so they don't
                pollute the canvas layout. Empty when no overlays are
                attached. */}
            <OverlayStage />
            <Inspector />
          </div>
        </div>
      </Craft>
    </AdapterProvider>
  )
}

// Re-export for App.tsx to wrap the entire editor in a top-shell boundary.
export { ErrorBoundary, TopShellErrorFallback }

// Phase 14 § 6.2 — brief loading veil over the canvas until the async
// document store finishes its first index read (and Hydrator applies the
// active document). Subscribes to the store's `ready` flag; renders
// nothing once ready so it adds no overhead to the steady state.
function DocumentLoadingOverlay() {
  const ready = useDocumentStore((s) => s.ready)
  if (ready) return null
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-muted/60 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" aria-hidden />
        Loading document…
      </div>
    </div>
  )
}

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
