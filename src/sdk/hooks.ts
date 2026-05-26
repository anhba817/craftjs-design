// Public SDK — hooks for inspector panel authors.
//
// useNodeClasses is the single I/O funnel for class-string + arbitrary-inline
// editing on a node's slot. It transparently routes reads/writes between the
// base breakpoint (style.classes / style.inline) and non-base breakpoints
// (style.responsive / style.responsiveInline) based on the editor's current
// activeBreakpoint.
//
// Panel authors should call this hook rather than poking Craft state
// directly — it captures the conventions the built-in panels rely on
// (responsive bucket routing, container peel on clear, etc.).
//
// @example
//   import { useNodeClasses } from '@design/sdk'
//
//   function MyPanel({ nodeId, slot = 'root' }: { nodeId: string; slot?: string }) {
//     const { classString, writeClasses } = useNodeClasses(nodeId, slot)
//     const onChange = (cls: string) => writeClasses(cls)
//     return <textarea value={classString} onChange={(e) => onChange(e.target.value)} />
//   }

export { useNodeClasses } from '../editor/inspector/shared/useNodeClasses'

/**
 * Phase 11 § 3.3 — multi-node variant for panels that want to support
 * multi-selection edits. Reads per-node classStrings + inlineStyles
 * and exposes write helpers that fan out atomically (one undo entry).
 *
 * Single-node panels should keep using `useNodeClasses`; this hook
 * is for panel authors who want to honor the editor's multi-select
 * model. Mixed-value detection is left to the caller — typical pattern:
 *
 * ```tsx
 * import { useNodeClassesMulti } from '@design/sdk'
 *
 * function MyMultiPanel({ nodeIds, slot }: { nodeIds: readonly string[]; slot: string }) {
 *   const { classStrings, writeClassesAll } = useNodeClassesMulti(nodeIds, slot)
 *   // Detect mixed values per field, then writeClassesAll((current) => …)
 * }
 * ```
 */
export { useNodeClassesMulti } from '../editor/inspector/shared/useNodeClassesMulti'

/**
 * Tailwind v4's responsive breakpoints. `'base'` is the no-prefix bucket
 * (writes to `style.classes`); `'sm'` / `'md'` / `'lg'` / `'xl'` / `'2xl'`
 * write to `style.responsive[<bp>]`. The active breakpoint is editor UI
 * state, not part of the saved document.
 */
export type { Breakpoint } from '../state/editorStore'

/**
 * Phase 11 § 3.11 — inline text-edit primitive for adapter impls.
 *
 * Renders text in two modes: (a) display = a React Fragment, no
 * extra DOM wrapper, parent's typography applies directly; (b) edit
 * = a `contentEditable` span that commits keystrokes via throttled
 * setProp so the entire edit gesture coalesces into one undo step.
 *
 * Adapter impls put `<EditableText text={content} propPath="content" />`
 * inside their root element and wire `onDoubleClick` on the root to
 * `useStartTextEdit()` to enter edit mode.
 *
 * @example
 * ```tsx
 * import { EditableText, useStartTextEdit } from '@design/sdk'
 *
 * function MyText({ props, rootRef }: AdapterRenderProps) {
 *   const { content } = props as { content: string }
 *   const startEdit = useStartTextEdit()
 *   return (
 *     <p ref={rootRef} onDoubleClick={(e) => { e.stopPropagation(); startEdit() }}>
 *       <EditableText text={content} propPath="content" multiline />
 *     </p>
 *   )
 * }
 * ```
 */
export { EditableText } from '../editor/text-edit/EditableText'

/**
 * Phase 11 § 3.11 — companion to `EditableText`. Adapter impls call
 * this in their root element's `onDoubleClick` handler to switch
 * the corresponding text region into edit mode.
 */
export { useStartTextEdit } from '../editor/text-edit/useStartTextEdit'
