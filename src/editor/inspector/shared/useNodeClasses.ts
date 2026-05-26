import { useNodeClassesMulti } from './useNodeClassesMulti'

/**
 * The single I/O funnel for class-string + arbitrary-inline editing on
 * a canvas node's style slot. Read the current class string + inline
 * style record; write either via `writeClasses(next)` or
 * `writeInline(cssProp, value)`.
 *
 * Routes reads / writes between the **base** breakpoint
 * (`style.classes` / `style.inline`) and **non-base** breakpoints
 * (`style.responsive` / `style.responsiveInline`) based on
 * `editorStore.activeBreakpoint`. Panel authors should call this hook
 * rather than poking Craft state directly — it captures the conventions
 * the built-in panels rely on (responsive bucket routing, container peel
 * on clear, etc.).
 *
 * The returned `classString` / `inlineStyle` always reflect the LIVE
 * `activeBreakpoint` — they're computed in the hook body, not in the
 * Craft collector, so breakpoint changes don't read stale data.
 *
 * @param nodeId - Craft node id (e.g., from `useEditor` collector).
 * @param slot - Style slot. `'root'` for Pattern A canonicals; named
 *   slot (`'header'`, `'body'`, …) for Pattern B canonicals like Card.
 *   Defaults to `'root'`.
 * @returns `{ classString, inlineStyle, writeClasses, writeInline,
 *   activeBreakpoint }`. `writeClasses(next)` replaces the slot's class
 *   string; `writeInline(prop, value)` sets a single CSS property (or
 *   clears it with `undefined`).
 *
 * @example
 * ```tsx
 * import { useNodeClasses } from '@crafted-design/editor/sdk'
 *
 * function MyPanel({ nodeId, slot = 'root' }: { nodeId: string; slot?: string }) {
 *   const { classString, writeClasses } = useNodeClasses(nodeId, slot)
 *   return (
 *     <textarea
 *       value={classString}
 *       onChange={(e) => writeClasses(e.target.value)}
 *     />
 *   )
 * }
 * ```
 */
export function useNodeClasses(nodeId: string, slot: string = 'root') {
  // Phase 11 § 3.3 — single-node thin wrapper over the multi-node hook.
  // SDK consumers using the legacy single-node API keep working; the
  // editor's own built-in panels switched to useNodeClassesMulti so
  // they can express multi-select edits.
  const m = useNodeClassesMulti([nodeId], slot)
  return {
    classString: m.classStrings[0] ?? '',
    inlineStyle: m.inlineStyles[0] ?? {},
    writeClasses: (next: string) => m.writeClassesAll(() => next),
    writeInline: m.writeInlineAll,
    activeBreakpoint: m.activeBreakpoint,
  }
}

