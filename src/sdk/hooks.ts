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
 * Tailwind v4's responsive breakpoints. `'base'` is the no-prefix bucket
 * (writes to `style.classes`); `'sm'` / `'md'` / `'lg'` / `'xl'` / `'2xl'`
 * write to `style.responsive[<bp>]`. The active breakpoint is editor UI
 * state, not part of the saved document.
 */
export type { Breakpoint } from '../state/editorStore'
