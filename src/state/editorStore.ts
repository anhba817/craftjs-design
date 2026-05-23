import { create } from 'zustand'

interface EditorStore {
  activeThemeId: string
  setActiveTheme: (id: string) => void

  activeAdapterId: string
  setActiveAdapter: (id: string) => void
}

// Editor-side state that is NOT part of the Craft document tree.
// Phase 2 added activeThemeId; Phase 3 adds activeAdapterId. Keep small.
// Zustand v5 idiom: create<T>()(initializer) for correct generic inference.
export const useEditorStore = create<EditorStore>()((set) => ({
  activeThemeId: 'default',
  setActiveTheme: (id) => set({ activeThemeId: id }),

  activeAdapterId: 'shadcn',
  setActiveAdapter: (id) => set({ activeAdapterId: id }),
}))
