import { create } from 'zustand'
import type { EditorDocument } from '@/persistence/schema'

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

  activeAdapterId: string
  setActiveAdapter: (id: string) => void

  // Phase 4 — UI-only state. Inspector panels read/write the active
  // breakpoint's slice. NOT persisted; resets to 'base' on reload.
  activeBreakpoint: Breakpoint
  setActiveBreakpoint: (bp: Breakpoint) => void

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

  activeAdapterId: 'shadcn',
  setActiveAdapter: (id) => set({ activeAdapterId: id }),

  activeBreakpoint: 'base',
  setActiveBreakpoint: (bp) => set({ activeBreakpoint: bp }),

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
}))
