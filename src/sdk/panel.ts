// Public SDK — inspector panel authoring surface.
//
// Panels render inside the Inspector for selected nodes. Each panel declares
// when it applies (via the `applicableTo` predicate) and what UI to render
// (via the `component` field). Built-in panels register themselves at module
// load; SDK consumers add custom panels the same way.
//
// @example
//   import { registerPanel, useNodeClasses } from '@crafted-design/editor/sdk'
//
//   function NotesPanel({ nodeId }: { nodeId: string }) {
//     const { classString, writeClasses } = useNodeClasses(nodeId)
//     return (
//       <textarea
//         value={classString}
//         onChange={(e) => writeClasses(e.target.value)}
//       />
//     )
//   }
//
//   registerPanel({
//     id: 'notes',
//     displayName: 'Notes',
//     order: 100,                      // after every built-in (70)
//     applicableTo: () => true,
//     component: NotesPanel,
//   })
//
// To replace a built-in (e.g., a custom Typography panel), unregisterPanel
// first then registerPanel with the same id, OR just registerPanel — the
// second call overwrites.

export type { PanelDefinition } from '../editor/inspector/panel-registry'

export {
  getPanelsFor,
  listPanels,
  registerPanel,
  unregisterPanel,
} from '../editor/inspector/panel-registry'
