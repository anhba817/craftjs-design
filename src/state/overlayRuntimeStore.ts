import type { ReactNode } from 'react'
import { create } from 'zustand'

// Phase 13 § 5.3 — runtime state for triggered overlays.
//
// Two facets:
// 1. `state[name]` — open / closed state for click-toggle overlays
//    (Modal / Drawer / Toast / Alert). Buttons with `triggers: [name]`
//    call `toggle(name)`.
// 2. `defs[name]` — a small registry every overlay node fills in on
//    mount with its kind (and content, for Tooltip / Popover whose
//    runtime behavior is "wrap the trigger" not "toggle open"). Buttons
//    read this registry to decide how to handle each trigger.
//
// `state[name] === undefined` means "use defaultOpen" so toggle-style
// overlays don't have to seed on mount.

export type OverlayKind =
  | 'modal'
  | 'drawer'
  | 'toast'
  | 'alert'
  | 'tooltip'
  | 'popover'

export interface OverlayDef {
  kind: OverlayKind
  // Tooltip — string body shown in the library's TooltipContent.
  // Popover — ReactNode children rendered inside PopoverContent.
  // Modal / Drawer / Toast / Alert leave these undefined; they own
  // their own runtime rendering via their adapter.
  text?: string
  content?: ReactNode
}

interface OverlayRuntimeStore {
  state: Record<string, boolean>
  defs: Record<string, OverlayDef>
  toggle: (name: string) => void
  set: (name: string, open: boolean) => void
  reset: () => void
  register: (name: string, def: OverlayDef) => void
  unregister: (name: string) => void
}

export const useOverlayRuntime = create<OverlayRuntimeStore>((set) => ({
  state: {},
  defs: {},
  toggle: (name) =>
    set((s) => {
      const current = s.state[name]
      return { state: { ...s.state, [name]: !(current ?? false) } }
    }),
  set: (name, open) =>
    set((s) => ({ state: { ...s.state, [name]: open } })),
  reset: () => set({ state: {} }),
  register: (name, def) =>
    set((s) => ({ defs: { ...s.defs, [name]: def } })),
  unregister: (name) =>
    set((s) => {
      if (!(name in s.defs)) return s
      const { [name]: _, ...rest } = s.defs
      return { defs: rest }
    }),
}))

// Helper for adapters — read the runtime open state for an overlay by
// name, falling back to defaultOpen when the store has no entry yet.
export function readOverlayOpen(
  state: Record<string, boolean>,
  name: string,
  defaultOpen: boolean,
): boolean {
  const v = state[name]
  return v === undefined ? defaultOpen : v
}
