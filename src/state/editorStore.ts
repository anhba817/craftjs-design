import { create } from 'zustand'
import type { EditorDocument } from '@/persistence/schema'
import type { StyleState } from '@/style/dimensions'

// Phase 12 § 4.13 — editor color mode. 'system' resolves to light/dark via
// the OS preference at render time.
export type ColorMode = 'light' | 'dark' | 'system'

// Phase 9 § 1.8 — cross-tab edit conflict.
//
// When another tab writes the active document's localStorage blob (or its
// :doc-index:v2 entry), the storage event fires in this tab.
// useConcurrentEditWatcher parses the new envelope and lifts it into this
// state; ConcurrentEditBanner renders the choice. Reload applies the
// other tab's version; Overwrite saves the local snapshot, blowing away
// what the other tab wrote.
export interface ConcurrentEditConflict {
  docId: string
  // Parsed envelope as it sits in storage RIGHT NOW (the version from
  // the other tab). Comparing against the in-memory canvas is the
  // user's responsibility — they pick which one wins.
  remoteEnvelope: EditorDocument
}

// Tailwind v4's default breakpoints. 'base' is our token for "no prefix" —
// the inspector writes to style.classes when active; sm/md/lg/xl/2xl write
// to style.responsive[<bp>].
export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

// Phase 9 § 1.9 — malformed-document state. Set by Hydrator /
// useDocumentSwitcher when integrity check fails or actions.deserialize
// throws. MalformedDocumentBanner reads this to replace the canvas
// Frame; resolving the state (Reset to empty) clears it.
export interface MalformedDocumentInfo {
  // The document id whose envelope is broken — used to scope the
  // archive key + the post-reset write target. 'shared' for failures
  // coming from a shared URL fragment.
  docId: string
  envelope: EditorDocument
  error: Error
}

interface EditorStore {
  activeThemeId: string
  setActiveTheme: (id: string) => void

  // Phase 12 § 4.13 — light/dark/system color mode. 'system' follows the
  // OS via prefers-color-scheme (resolved by useEffectiveColorScheme).
  // Persisted in the saved document.
  colorMode: ColorMode
  setColorMode: (mode: ColorMode) => void

  activeAdapterId: string
  setActiveAdapter: (id: string) => void

  // Phase 18 follow-up — host-controlled adapter policy. When false, the
  // adapter is fixed by the host (<Editor adapter=… />): the AdapterSwitcher
  // is hidden AND applying a document envelope does NOT override the active
  // adapter (documents are canonical-id based, so they render fine under
  // whichever adapter the host pinned). Set by <Editor /> from its props.
  allowAdapterSwitch: boolean
  setAllowAdapterSwitch: (allow: boolean) => void

  // Phase 25 — responsive chrome. Below the lg breakpoint the side panels are
  // overlay drawers toggled from the toolbar; these flags drive them. At/above
  // lg the panels are docked columns that ignore these flags (always visible).
  // UI-only; not persisted.
  leftPanelOpen: boolean
  setLeftPanelOpen: (open: boolean) => void
  rightPanelOpen: boolean
  setRightPanelOpen: (open: boolean) => void
  closeAllPanels: () => void

  // Phase 4 — UI-only state. Inspector panels read/write the active
  // breakpoint's slice. NOT persisted; resets to 'base' on reload.
  activeBreakpoint: Breakpoint
  setActiveBreakpoint: (bp: Breakpoint) => void

  // Phase 12 § 4.2 — active pseudo-class state. Combined with
  // activeBreakpoint, picks which (bp × state) quadrant the inspector
  // panels read/write. UI-only; resets to 'base'. When non-base, the
  // selected node also previews the state on the canvas (see
  // CanonicalNode).
  activeState: StyleState
  setActiveState: (s: StyleState) => void

  malformedDocument: MalformedDocumentInfo | null
  setMalformedDocument: (info: MalformedDocumentInfo | null) => void

  // Phase 9 § 1.7 — storage quota state. `percent` is the fraction of a
  // conservative 5 MB threshold currently used by craftjs-design:* keys.
  // `dismissed` survives reloads via sessionStorage but resets when the
  // tab closes. `saveFailed` is set when a localStorage.setItem call
  // throws QuotaExceededError — the modal renders until the user
  // chooses an action.
  storageQuotaPercent: number
  storageQuotaDismissed: boolean
  storageSaveFailed: StorageSaveFailedInfo | null

  setStorageQuotaPercent: (percent: number) => void
  dismissStorageQuotaBanner: () => void
  setStorageSaveFailed: (info: StorageSaveFailedInfo | null) => void

  concurrentEditConflict: ConcurrentEditConflict | null
  setConcurrentEditConflict: (info: ConcurrentEditConflict | null) => void

  // Phase 11 § 3.2 — internal clipboard. Holds a serialised NodeTree
  // copied via the clipboard helper. System clipboard isn't used (the
  // browser permission model requires explicit user gestures per tab,
  // which the editor's keyboard shortcuts don't always carry). Survives
  // across editor remounts in the same tab; cleared on document switch.
  clipboard: unknown | null
  setClipboard: (tree: unknown | null) => void

  // Phase 11 § 3.3 — multi-selection. This is the editor's source of
  // truth for which nodes are selected; Craft's events.selected is
  // mirrored to selection[0] so connectors (resize handles, default
  // left-click) keep working on a "primary" selection. Empty array
  // means nothing is selected. Cleared on document switch.
  //
  // Why a separate field instead of just reading Craft's Set: Craft's
  // public action surface only exposes single-node selectNode(id). To
  // add modifier-click toggle/range semantics we'd have to dispatch
  // private actions; keeping our own array is simpler and lets the
  // Inspector / overlays / multi-delete subscribe via the standard
  // zustand selector pattern without touching @craftjs internals.
  selection: string[]
  setSelection: (ids: string[]) => void
  toggleSelection: (id: string) => void
  clearSelection: () => void

  // Phase 11 § 3.11 — inline text editing. When non-null, the
  // adapter impl for that node renders a contentEditable span
  // instead of static text. The editable commits on blur and
  // unsets this flag. Cleared on document switch alongside
  // selection / clipboard.
  //
  // Why a single id (not a Set): only one text node can be in
  // edit mode at a time — `contentEditable` requires DOM focus,
  // and focus is single. Multi-edit is meaningless here.
  editingTextNode: string | null
  setEditingTextNode: (id: string | null) => void
}

export interface StorageSaveFailedInfo {
  operation: 'writeDocument' | 'writeDocumentIndex' | 'deleteDocumentBlob'
  // The document id involved, when meaningful. writeDocumentIndex isn't
  // scoped to a single doc.
  docId?: string
}

const QUOTA_DISMISS_SESSION_KEY = 'craftjs-design.quota-dismissed'

function readDismissedFromSession(): boolean {
  try {
    return sessionStorage.getItem(QUOTA_DISMISS_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function writeDismissedToSession(value: boolean): void {
  try {
    if (value) {
      sessionStorage.setItem(QUOTA_DISMISS_SESSION_KEY, '1')
    } else {
      sessionStorage.removeItem(QUOTA_DISMISS_SESSION_KEY)
    }
  } catch {
    // Session storage may be disabled (private mode). Banner reverts to
    // session-only memory; acceptable degradation.
  }
}

// Editor-side state that is NOT part of the Craft document tree.
// Zustand v5 idiom: create<T>()(initializer) for correct generic inference.
export const useEditorStore = create<EditorStore>()((set) => ({
  activeThemeId: 'default',
  setActiveTheme: (id) => set({ activeThemeId: id }),

  colorMode: 'system',
  setColorMode: (mode) => set({ colorMode: mode }),

  activeAdapterId: 'shadcn',
  setActiveAdapter: (id) => set({ activeAdapterId: id }),

  allowAdapterSwitch: true,
  setAllowAdapterSwitch: (allow) => set({ allowAdapterSwitch: allow }),

  leftPanelOpen: false,
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  rightPanelOpen: false,
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  closeAllPanels: () => set({ leftPanelOpen: false, rightPanelOpen: false }),

  activeBreakpoint: 'base',
  setActiveBreakpoint: (bp) => set({ activeBreakpoint: bp }),

  activeState: 'base',
  setActiveState: (s) => set({ activeState: s }),

  malformedDocument: null,
  setMalformedDocument: (info) => set({ malformedDocument: info }),

  storageQuotaPercent: 0,
  storageQuotaDismissed: readDismissedFromSession(),
  storageSaveFailed: null,

  setStorageQuotaPercent: (percent) => {
    set((prev) => {
      // If the user previously dismissed but usage is now BELOW the 80%
      // threshold, the dismiss state is moot — clearing it means the
      // banner returns automatically if they cross the threshold again.
      const stillElevated = percent >= 80
      const dismissed = stillElevated ? prev.storageQuotaDismissed : false
      if (!stillElevated && prev.storageQuotaDismissed) {
        writeDismissedToSession(false)
      }
      return { storageQuotaPercent: percent, storageQuotaDismissed: dismissed }
    })
  },
  dismissStorageQuotaBanner: () => {
    writeDismissedToSession(true)
    set({ storageQuotaDismissed: true })
  },
  setStorageSaveFailed: (info) => set({ storageSaveFailed: info }),

  concurrentEditConflict: null,
  setConcurrentEditConflict: (info) => set({ concurrentEditConflict: info }),

  clipboard: null,
  setClipboard: (tree) => set({ clipboard: tree }),

  selection: [],
  setSelection: (ids) => {
    // Defensive: drop duplicates while preserving order so subscribers
    // see a stable shape. The modifier-click handler should never feed
    // duplicates in, but a stray double-toggle in a future caller
    // shouldn't break reference equality of selection[0].
    const seen = new Set<string>()
    const deduped: string[] = []
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id)
        deduped.push(id)
      }
    }
    set({ selection: deduped })
  },
  toggleSelection: (id) =>
    set((prev) => {
      const next = prev.selection.includes(id)
        ? prev.selection.filter((x) => x !== id)
        : [...prev.selection, id]
      return { selection: next }
    }),
  clearSelection: () => set({ selection: [] }),

  editingTextNode: null,
  setEditingTextNode: (id) => set({ editingTextNode: id }),
}))
