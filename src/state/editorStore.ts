import { create } from 'zustand'

interface EditorStore {
  activeThemeId: string
  setActiveTheme: (id: string) => void
}

// Editor-side state that is NOT part of the Craft document tree.
// Today: active theme. Phase 3 will add active adapter id. Keep small.
// Zustand v5 idiom: create<T>()(initializer) for correct generic inference.
export const useEditorStore = create<EditorStore>()((set) => ({
  activeThemeId: 'default',
  setActiveTheme: (id) => set({ activeThemeId: id }),
}))
