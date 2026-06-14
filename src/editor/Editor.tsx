import { Editor as Craft, Element, Frame, useEditor } from '@craftjs/core'
import { Loader2 } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  type Ref,
} from 'react'
import { AdapterProvider, getAdapter } from '../adapters/AdapterContext'
import { getResolver } from '../craft/resolver'
import {
  bootstrapDocumentStore,
  useDocumentStore,
} from '../persistence/documentStore'
import type { EditorDocument } from '../persistence/schema'
import { _markEditorMounted, getComponent } from '../registry/registry'
import { useEditorStore } from '../state/editorStore'
import { ThemeProvider } from '../themes/ThemeProvider'
import { resolveChromeTheme } from './chromeTheme'
import type { EditorChromeTheme } from './chromeTheme'
import { ControlledHydrator, DefaultValueSeeder } from './ControlledHydrator'
import { applyEnvelope, buildEnvelope, normalizeDocument } from './document/envelope'
import { resolveEmbeddingMode } from './embedding'
import { useDocumentChangeEmitter } from './useDocumentChangeEmitter'
import { SCOPE_CLASS } from '../style/scope'
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
import { Hydrator, _resetHydrationLatch } from './Hydrator'
import { LeftAside } from './LeftAside'
import { RightPanel } from './RightPanel'
import { ChromeDrawer } from './responsive/ChromeDrawer'
import { useEditorViewport } from './responsive/useEditorViewport'
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
  /**
   * Host-chosen editor-chrome theme — the look of the editor's own UI
   * (toolbox, inspector, toolbar, panels, banners). A built-in preset
   * (`'light'` default, `'dark'`) or a partial {@link EditorChromeTokens}
   * map (optionally extending a preset via its `preset` field). This is NOT
   * the document theme system: `registerTheme` / the canvas ThemeSwitcher /
   * `colorMode` style the CONTENT end users design, and stay independent —
   * dark chrome around a light document works, Figma-style. Like `adapter`,
   * this is host policy: end users get no chrome-theme control.
   */
  editorTheme?: EditorChromeTheme
  /**
   * Phase 23 — **controlled** document. When set, `value` is the single source
   * of truth: the editor re-seeds whenever `value`'s identity changes, the
   * built-in persistence (IndexedDB) is bypassed entirely, and edits are
   * surfaced via {@link onChange}. Accepts an {@link EditorDocument} envelope
   * or its JSON string (both validated + migrated like an Import). For a
   * one-time seed without taking over the document lifecycle, use
   * {@link defaultValue} instead.
   */
  value?: EditorDocument | string
  /**
   * Phase 23 — **uncontrolled** initial seed, applied once on mount. Edits stay
   * internal (and persist unless `persistence={false}`), surfaced via
   * {@link onChange}. Ignored when {@link value} is set. Accepts an envelope
   * object or its JSON string.
   */
  defaultValue?: EditorDocument | string
  /**
   * Phase 23 — called (debounced) whenever the document changes, with the
   * current {@link EditorDocument} envelope. Fires on structural edits AND
   * prop/style edits. The same shape Save / Export produce. Stringify it for
   * your own persistence: `onChange={(doc) => save(JSON.stringify(doc))}`.
   */
  onChange?: (doc: EditorDocument) => void
  /**
   * Phase 23 — debounce window (ms) for {@link onChange}. Defaults to 150.
   */
  onChangeDebounceMs?: number
  /**
   * Phase 23 — whether the editor manages its own document persistence
   * (IndexedDB store, autosave, the document index). Defaults to `true`. Set
   * `false` (or pass {@link value}, which implies it) for an embed that owns
   * the document itself via `defaultValue` + `onChange` and never touches
   * IndexedDB.
   */
  persistence?: boolean
  /**
   * Phase 23 — hide the document-management chrome: the top Save/Load/Import/
   * Export/Share/DocumentMenu bar, the onboarding tour, the storage-quota
   * banners + modal, and the cross-tab concurrent-edit watcher. The editing
   * surface (toolbox, canvas, inspector) stays. For an embed that owns the
   * document via `value`/`defaultValue` + `onChange` and renders its own
   * save/load UI. Defaults to `false` (full chrome). Independent of
   * {@link persistence} — but typically paired with it.
   */
  hideChrome?: boolean
}

/**
 * Phase 23 (P5) — imperative handle on `<Editor>`. Pass a `ref` to read the
 * current document on demand or set it programmatically without going through
 * the controlled `value` prop. Redundant with `onChange` / `value` but handy
 * for "serialize on a Save button click" without holding the doc in state.
 *
 * @example
 *   const ref = useRef<EditorHandle>(null)
 *   // …
 *   <Editor ref={ref} />
 *   <button onClick={() => save(ref.current!.getDocument())}>Save</button>
 */
export interface EditorHandle {
  /** Serialize the live canvas into the current document envelope. */
  getDocument(): EditorDocument
  /** Replace the canvas with the given envelope (object or JSON string). */
  setDocument(doc: EditorDocument | string): void
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  {
    adapter,
    allowUserToSwitchAdapter,
    editorTheme,
    value,
    defaultValue,
    onChange,
    onChangeDebounceMs,
    persistence,
    hideChrome = false,
  }: EditorProps,
  ref: Ref<EditorHandle>,
) {
  // Phase 23 — controlled when `value` is supplied; persistence defaults on
  // but is forced off in controlled mode (`value` is the source of truth).
  const { controlled, persist } = resolveEmbeddingMode({ value, persistence })

  // Phase 23 — onChange rides Craft's onNodesChange (debounced). The shared
  // serializedRef lets ControlledHydrator dedupe the onChange→value→apply echo.
  const { onNodesChange, serializedRef } = useDocumentChangeEmitter(
    onChange,
    onChangeDebounceMs,
  )

  // Phase 25 — responsive side panels (drawers below lg). Open/close flags +
  // the viewport. At/above lg the docked columns ignore the flags.
  const leftPanelOpen = useEditorStore((s) => s.leftPanelOpen)
  const rightPanelOpen = useEditorStore((s) => s.rightPanelOpen)
  const setLeftPanelOpen = useEditorStore((s) => s.setLeftPanelOpen)
  const setRightPanelOpen = useEditorStore((s) => s.setRightPanelOpen)
  const { isDesktop } = useEditorViewport()
  // Auto-open the inspector drawer when a node is selected on a narrow
  // viewport — so the user sees its properties without hunting for the toggle.
  // A SEPARATE store read, decoupled from the flushSync selection-sync write
  // (so it can't perturb selection latency — see [[feedback_selection_sync]]).
  const primarySelection = useEditorStore((s) => s.selection[0] ?? null)
  useEffect(() => {
    if (!isDesktop && primarySelection) setRightPanelOpen(true)
  }, [isDesktop, primarySelection, setRightPanelOpen])

  // Phase 6 — flip the registry's post-mount flag so any registerCanonical
  // calls after this point warn instead of silently failing to appear.
  useEffect(() => {
    _markEditorMounted()
  }, [])

  // Phase 23 § Decision 5 — clear the within-realm hydration latch when THIS
  // <Editor> unmounts, so the next mount (e.g. an SPA stepping to a new form)
  // re-hydrates. The latch stays module-level to survive the AdapterProvider
  // Wrapper remount mid-session; only the outer unmount resets it.
  useEffect(() => () => _resetHydrationLatch(), [])

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

  // Phase 19 — apply the chrome theme on <html>, not the editor root div:
  // chrome renders OUTSIDE the root too (sibling overlays above — banners,
  // modals, resize handles — and Radix content portaled to <body>), and CSS
  // variables only cascade downward. The --ed-* variables are inert outside
  // chrome markup, so the host page is unaffected. Layout effect → applied
  // before first paint, no light flash. Serialized dep so an inline token
  // map object doesn't re-run the effect every render. Last mounted editor
  // wins if several mount at once (documented).
  const chromeThemeKey = JSON.stringify(editorTheme ?? null)
  useLayoutEffect(() => {
    const { preset, vars } = resolveChromeTheme(
      (JSON.parse(chromeThemeKey) ?? undefined) as EditorChromeTheme | undefined,
    )
    const html = document.documentElement
    html.setAttribute('data-editor-theme', preset)
    for (const [cssVar, value] of Object.entries(vars)) {
      html.style.setProperty(cssVar, value)
    }
    return () => {
      html.removeAttribute('data-editor-theme')
      for (const cssVar of Object.keys(vars)) html.style.removeProperty(cssVar)
    }
  }, [chromeThemeKey])

  // Phase 14 § 6.2 — bootstrap the async document store on mount: runs the
  // adapter's one-time init (legacy migration / IDB import), reads the index,
  // flips `ready`, and seeds the storage-quota percent. Hydrator waits on
  // `ready` before applying the active document.
  // Phase 23 — skipped when persistence is off / controlled: no IndexedDB I/O,
  // and the canvas isn't gated on the store's `ready` flag (see persist prop
  // threaded to DocumentLoadingOverlay below).
  useEffect(() => {
    if (!persist) return
    void bootstrapDocumentStore()
  }, [persist])

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
    // Phase 24 — the scope root. Wraps the ENTIRE editor output (not just the
    // cd-editor-chrome shell) because sibling overlays — ResizeOverlay,
    // GuideOverlay, CanvasSearch, the tour, banners — render outside that shell
    // and must also fall under the scope so the opt-in scoped stylesheet
    // reaches them. Inert under the default global index.css (its rules aren't
    // scope-prefixed, so the class matches nothing).
    <div className={SCOPE_CLASS}>
      <AdapterProvider>
        {/* Always pass our handler (it no-ops internally when no `onChange` is
            set). Passing `undefined` here would CLOBBER Craft's default
            `onNodesChange: () => null`, and Craft calls it on every node change
            (incl. deserialize) → "onNodesChange is not a function". */}
        <Craft resolver={resolver} onNodesChange={onNodesChange}>
        {/* Phase 23 (P5) — bridge the imperative handle out of the Craft
            context (where query/actions live) to the forwarded ref. */}
        <EditorImperativeHandle handleRef={ref} serializedRef={serializedRef} />
        {/* Phase 23 — controlled (`value`) vs uncontrolled. In controlled mode
            ControlledHydrator owns seeding and the persistence Hydrator is
            bypassed; otherwise the store-backed Hydrator runs (only when
            persistence is on). defaultValue seeds an uncontrolled embed once. */}
        {controlled && value !== undefined ? (
          <ControlledHydrator value={value} serializedRef={serializedRef} />
        ) : persist ? (
          <Hydrator />
        ) : (
          defaultValue !== undefined && (
            <DefaultValueSeeder
              value={defaultValue}
              serializedRef={serializedRef}
            />
          )
        )}
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
            "Show tour again" entry replays it.
            Phase 23 — document-management chrome, hidden under `hideChrome`. */}
        {!hideChrome && <OnboardingTour />}
        {/* Phase 9 § 1.6 — toast for uncaught async errors (effects,
            event handlers, fetch promises) that the React render-path
            ErrorBoundaries don't see. Critical async failures
            (Hydrator deserialize) still bubble to a boundary; this
            handles everything else. Kept even under `hideChrome` — it's
            generic error surfacing, not document-management UI. */}
        <AsyncErrorBanner />
        {/* Phase 9 § 1.7 — blocking modal when localStorage save fails
            with QuotaExceededError. Persistence chrome → hidden under
            `hideChrome`. */}
        {!hideChrome && <StorageQuotaErrorModal />}
        {/* Phase 19 — `cd-editor-chrome` marks the editor shell (a styling
            hook for chrome-wide CSS like scrollbars). The chrome THEME is
            applied higher up — data-editor-theme + --ed-* variables go on
            <html> via the layout effect above, so sibling overlays and
            body-portaled chrome are themed too. bg-ed-surface is the shell
            backdrop: panels (SaveLoadBar, LeftAside, Inspector) are
            intentionally transparent and historically showed the white
            <body> through — the backdrop is what themes them. */}
        <div className="cd-editor-chrome flex h-screen flex-col bg-ed-surface text-ed-text">
          {/* Phase 23 — the top document bar + persistence banners + cross-tab
              watcher are document-management chrome, dropped under `hideChrome`
              (an embed renders its own save/load UI). The editing surface
              below (toolbox, canvas, inspector) always stays. */}
          {!hideChrome && <SaveLoadBar />}
          {/* Phase 9 § 1.7 — non-blocking warning when usage ≥ 80%. */}
          {!hideChrome && <StorageQuotaBanner />}
          {/* Phase 9 § 1.8 — cross-tab edit detected; user picks which
              version wins. */}
          {!hideChrome && <ConcurrentEditBanner />}
          {!hideChrome && <ConcurrentEditWatcherMount />}
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
          {/* Phase 25 — `relative` anchors the side panels' overlay drawers
              (absolute inset-0) to this row below the lg breakpoint. */}
          <div className="relative flex min-h-0 flex-1">
            {/* Phase 11 § 3.4 — left aside hosts both Components and
                Layers tabs. Per-tab ErrorBoundaries live inside
                LeftAside so a buggy LayerTree doesn't drop the
                toolbox. Phase 25 — docked column ≥lg, overlay drawer below. */}
            <ChromeDrawer
              side="left"
              open={leftPanelOpen}
              onClose={() => setLeftPanelOpen(false)}
              label="Components and layers"
            >
              <LeftAside />
            </ChromeDrawer>
            <ThemeProvider>
              <main
                data-onboarding-target="canvas"
                className="relative flex-1 overflow-auto bg-ed-surface-3 p-8"
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
                  <DocumentLoadingOverlay persist={persist} />
                </ErrorBoundary>
              </main>
            </ThemeProvider>
            {/* Phase 25 — the right panel tabifies Properties + Overlays into
                one column (Decision 2); docked ≥lg, overlay drawer below. The
                `#craftjs-overlay-stage` portal target lives inside RightPanel
                (kept mounted across tabs) — overlays still portal there in
                editing mode. */}
            <ChromeDrawer
              side="right"
              open={rightPanelOpen}
              onClose={() => setRightPanelOpen(false)}
              label="Inspector"
            >
              <RightPanel />
            </ChromeDrawer>
          </div>
        </div>
        </Craft>
      </AdapterProvider>
    </div>
  )
})

// Re-export for App.tsx to wrap the entire editor in a top-shell boundary.
export { ErrorBoundary, TopShellErrorFallback }

// Phase 23 (P5) — lives inside <Craft> so it can read query/actions, and
// projects the imperative API onto the ref the host passed to <Editor>.
// getDocument serializes the live canvas; setDocument applies an envelope and
// syncs serializedRef so the change doesn't echo back through onChange.
function EditorImperativeHandle({
  handleRef,
  serializedRef,
}: {
  handleRef: Ref<EditorHandle>
  serializedRef: React.RefObject<string | null>
}) {
  const { actions, query } = useEditor()
  useImperativeHandle(
    handleRef,
    () => ({
      getDocument: () => buildEnvelope(query),
      setDocument: (doc) => {
        const envelope = normalizeDocument(doc)
        applyEnvelope(actions, envelope)
        try {
          serializedRef.current = query.serialize()
        } catch {
          /* query may be briefly unavailable mid-teardown; ignore */
        }
      },
    }),
    [actions, query, serializedRef],
  )
  return null
}

// Phase 14 § 6.2 — brief loading veil over the canvas until the async
// document store finishes its first index read (and Hydrator applies the
// active document). Subscribes to the store's `ready` flag; renders
// nothing once ready so it adds no overhead to the steady state.
function DocumentLoadingOverlay({ persist }: { persist: boolean }) {
  const ready = useDocumentStore((s) => s.ready)
  // Phase 23 — with persistence off the store is never bootstrapped (so
  // `ready` stays false); the canvas renders immediately, no veil.
  if (!persist || ready) return null
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-ed-surface-3/60 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm text-ed-text-muted">
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
