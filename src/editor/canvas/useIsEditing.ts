import { useEditor } from '@craftjs/core'

// Phase 13 § 5.3 — small hook that returns Craft's `state.options.enabled`.
// Overlay-style adapters branch on this: editing → inline + always open;
// runtime / preview → the library's real overlay primitive.
//
// Phase 21 — headless-tolerant: the static HTML renderer (`/headless`
// renderDocumentToHtml) renders adapter impls OUTSIDE a Craft editor, where
// `useEditor` throws. Catching that and returning `false` gives those renders
// runtime semantics. Hook-order safety: a given component instance lives its
// whole life either inside Craft or outside it, so the hook sequence is
// stable per instance across renders (inside: the full useEditor chain;
// outside: useEditor throws at the same point every render).
export function useIsEditing(): boolean {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- deliberate try/catch, NOT a conditional call: useEditor runs unconditionally and only THROWS when there's no Craft context. Per component instance the environment never changes, so the hook sequence is identical on every render (see the header comment).
    const { enabled } = useEditor((state) => ({
      enabled: state.options.enabled,
    }))
    return enabled
  } catch {
    return false // no Craft context → headless/static render → runtime
  }
}
