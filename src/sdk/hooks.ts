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
