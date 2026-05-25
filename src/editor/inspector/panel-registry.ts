import type { ComponentType } from 'react'
import type { CanonicalComponent } from '@/registry/types'

// Phase 6 — pluggable inspector panels.
//
// A panel renders inside the Inspector's per-slot section for selected nodes.
// Built-ins (Layout, Size, Spacing, Typography, Appearance, Effects, Props)
// register themselves at module load via src/editor/inspector/built-in-panels.
// SDK consumers can registerPanel() at module load to add a custom panel, or
// unregisterPanel() + re-register to replace a built-in.

/** A pluggable Inspector panel — the contract `registerPanel()` accepts. */
export interface PanelDefinition {
  /**
   * Stable identifier. Matches `CanonicalComponent.applicablePanels`
   * entries when a canonical explicitly whitelists panels. Built-ins use:
   * `'layout' | 'size' | 'spacing' | 'typography' | 'appearance' |
   * 'effects' | 'componentProps'`.
   */
  id: string
  /** Section header shown in the Inspector. */
  displayName: string
  /**
   * Sort key. Built-ins use 10, 20, 30, … so custom panels can interleave.
   * Lower numbers render first.
   */
  order: number
  /**
   * Predicate consulted when the canonical does NOT declare an explicit
   * `applicablePanels` whitelist. Return true to render the panel for
   * this canonical. If `applicablePanels` IS set on the canonical, this
   * predicate is ignored — only ids in the whitelist render.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applicableTo: (def: CanonicalComponent<any>) => boolean
  /**
   * The panel UI. Receives the selected node id and the active style
   * slot (`'root'` for Pattern A canonicals; named slot for Pattern B).
   */
  component: ComponentType<{ nodeId: string; slot: string }>
}

const panels = new Map<string, PanelDefinition>()

/**
 * Register an inspector panel. Re-registering an existing id replaces
 * the previous definition — used by SDK consumers overriding a built-in.
 *
 * Built-in ids: `'layout'`, `'size'`, `'spacing'`, `'typography'`,
 * `'appearance'`, `'effects'`, `'componentProps'`.
 *
 * @example
 * ```ts
 * import { registerPanel, useNodeClasses } from '@crafted-design/editor/sdk'
 *
 * function NotesPanel({ nodeId }: { nodeId: string }) {
 *   const { classString, writeClasses } = useNodeClasses(nodeId)
 *   return (
 *     <textarea
 *       value={classString}
 *       onChange={(e) => writeClasses(e.target.value)}
 *     />
 *   )
 * }
 *
 * registerPanel({
 *   id: 'notes',
 *   displayName: 'Notes',
 *   order: 100,           // after every built-in (max 70)
 *   applicableTo: () => true,
 *   component: NotesPanel,
 * })
 * ```
 */
export function registerPanel(panel: PanelDefinition): void {
  panels.set(panel.id, panel)
}

/** Remove a panel by id. Returns true if a panel was removed. */
export function unregisterPanel(id: string): boolean {
  return panels.delete(id)
}

/** Every registered panel, sorted by `order` ascending. */
export function listPanels(): PanelDefinition[] {
  return [...panels.values()].sort((a, b) => a.order - b.order)
}

/**
 * Returns the panels that should render for the given canonical.
 *
 * Resolution rules:
 *   - If the canonical declares `applicablePanels`, that's a whitelist:
 *     only registered panels whose id appears in the list render. Custom
 *     panels not in the list are excluded.
 *   - Otherwise, each panel's `applicableTo` predicate decides.
 */
export function getPanelsFor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  def: CanonicalComponent<any>,
): PanelDefinition[] {
  const ordered = listPanels()
  if (def.applicablePanels) {
    const allowed = new Set<string>(def.applicablePanels as readonly string[])
    return ordered.filter((p) => allowed.has(p.id))
  }
  return ordered.filter((p) => p.applicableTo(def))
}
