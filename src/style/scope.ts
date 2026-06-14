// Phase 24 (Group A) — the scope root.
//
// The opt-in scoped stylesheet (`@crafted-design/editor/index.scoped.css`,
// Group B) prefixes every editor rule with `.crafted-design-scope`, so the
// editor's preflight + `--color-*` / `--ed-*` tokens apply ONLY inside the
// editor subtree — never clobbering a Tailwind-v4 host. For that to work, every
// element the editor renders must live under a node carrying this class.
//
// `<Editor>` and `<DocumentRenderer>` put it on their outermost wrapper. The
// hard case is runtime overlays (Modal / Drawer / Toast …) which `createPortal`
// to `document.body` — DOM-detached from the editor subtree, so they'd escape
// the scope. `getScopedPortalRoot()` gives them a single, body-level,
// scope-classed container to portal into instead.
export const SCOPE_CLASS = 'crafted-design-scope'

const PORTAL_ROOT_ID = 'crafted-design-portal-root'

// Lazily create (once) and return a body-level container tagged with the scope
// class. Runtime overlay portals target this instead of bare `document.body`,
// so scoped CSS + the editor's tokens still reach them. Page-level shared — the
// scope is class-based, not per-instance (multi-instance isolation is a
// separate, larger effort, out of scope for the scoped sheet).
export function getScopedPortalRoot(): HTMLElement {
  // Browser-only (overlays render under react-dom). Guarded so an accidental
  // SSR/headless call doesn't throw on `document`.
  if (typeof document === 'undefined') {
    throw new Error(
      'getScopedPortalRoot() requires a DOM — call it only from client-rendered overlays.',
    )
  }
  const existing = document.getElementById(PORTAL_ROOT_ID)
  if (existing) return existing
  const el = document.createElement('div')
  el.id = PORTAL_ROOT_ID
  el.className = SCOPE_CLASS
  document.body.appendChild(el)
  return el
}
