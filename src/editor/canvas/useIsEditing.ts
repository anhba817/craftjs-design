import { useEditor } from '@craftjs/core'

// Phase 13 § 5.3 — small hook that returns Craft's `state.options.enabled`.
// Overlay-style adapters branch on this: editing → inline + always open;
// runtime / preview → the library's real overlay primitive.
export function useIsEditing(): boolean {
  const { enabled } = useEditor((state) => ({
    enabled: state.options.enabled,
  }))
  return enabled
}
