import { useEditor } from '@craftjs/core'
import { useEditorStore } from '@/state/editorStore'
import type { NodeStyle } from '@/registry/types'

type NodeProps = { style: NodeStyle }

// Read/write the active-breakpoint's class slice for a slot. Funnels all
// inspector class-string I/O through one place.
//
// Subscription model is intentionally split:
//   - useEditor's collector subscribes to THIS node's props. When Immer's
//     setProp produces a new props ref, the collector returns a different ref
//     and the consuming component re-renders.
//   - activeBreakpoint lives in Zustand. It's read via useEditorStore which
//     subscribes independently.
//   - classString is computed in the body (not the collector) so it always
//     reflects the LIVE activeBreakpoint. Otherwise the collector closure
//     captures activeBreakpoint at the previous Craft state change, and edits
//     at non-base breakpoints read stale data — every md edit would re-merge
//     against the base classes and clobber previous md edits.
export function useNodeClasses(nodeId: string, slot: string = 'root') {
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint)

  const { actions, props } = useEditor((_, q) => {
    return { props: q.node(nodeId).get().data.props as NodeProps }
  })

  const style = props.style
  const classString =
    activeBreakpoint === 'base'
      ? style.classes?.[slot] ?? ''
      : style.responsive?.[activeBreakpoint]?.[slot] ?? ''

  const writeClasses = (next: string) => {
    actions.setProp(nodeId, (props: NodeProps) => {
      if (activeBreakpoint === 'base') {
        props.style.classes[slot] = next
      } else {
        // Initialize the nested objects on first write at this breakpoint.
        if (!props.style.responsive) props.style.responsive = {}
        if (!props.style.responsive[activeBreakpoint]) {
          props.style.responsive[activeBreakpoint] = {}
        }
        props.style.responsive[activeBreakpoint][slot] = next
      }
    })
  }

  return { classString, writeClasses, activeBreakpoint }
}
