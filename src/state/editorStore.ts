import { create } from 'zustand'
import type { EditorDocument } from '@/persistence/schema'

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
}))
