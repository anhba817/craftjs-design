import { create } from 'zustand'

// Tailwind v4's default breakpoints. 'base' is our token for "no prefix" —
// the inspector writes to style.classes when active; sm/md/lg/xl/2xl write
// to style.responsive[<bp>].
export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface EditorStore {
  activeThemeId: string
  setActiveTheme: (id: string) => void

  activeAdapterId: string
  setActiveAdapter: (id: string) => void

  // Phase 4 — UI-only state. Inspector panels read/write the active
  // breakpoint's slice. NOT persisted; resets to 'base' on reload.
  activeBreakpoint: Breakpoint
  setActiveBreakpoint: (bp: Breakpoint) => void
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
}))
