// Public SDK — overlay authoring surface (Phase 18 § 5).
//
// Overlay canonicals (Modal / Drawer / Toast / Tooltip / Popover) and the
// components that trigger them need three things the editor owns:
//
//   - the runtime open/close store (`useOverlayRuntime`) + the
//     `readOverlayOpen` helper that resolves a named overlay's open state,
//   - the editor's overlay-stage portal target (`useOverlayStageTarget`) —
//     where an overlay renders its editor-mode preview instead of inline in
//     the canvas,
//   - `OverlayCard`, the labeled wrapper that preview is portaled into,
//   - `getScopedPortalRoot` (Phase 24) — the body-level, scope-classed
//     container a RUNTIME overlay should `createPortal` into instead of bare
//     `document.body`, so the opt-in scoped stylesheet still reaches it.
//
// The built-in adapters use these; exposing them here lets a third-party
// adapter build overlay impls with the same editor/runtime behavior. See the
// `useIsEditing` doc in ./hooks for the editor-vs-runtime branching contract.

export {
  useOverlayRuntime,
  readOverlayOpen,
} from '../state/overlayRuntimeStore'
export type { OverlayKind, OverlayDef } from '../state/overlayRuntimeStore'
export { useOverlayStageTarget } from '../editor/canvas/useOverlayStageTarget'
export { OverlayCard } from '../editor/overlay-stage/OverlayCard'
export { getScopedPortalRoot } from '../style/scope'
