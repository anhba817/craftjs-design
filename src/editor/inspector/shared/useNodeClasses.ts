import { useEditor } from '@craftjs/core'
import { useEditorStore } from '@/state/editorStore'
import type { NodeStyle } from '@/registry/types'

type NodeProps = { style: NodeStyle }

// Read/write the active-breakpoint's class slice for a slot, plus inline
// arbitrary values. Funnels all inspector style I/O through one place.
//
// Subscription model is intentionally split:
//   - useEditor's collector subscribes to THIS node's props. When Immer's
//     setProp produces a new props ref, the collector returns a different ref
//     and the consuming component re-renders.
//   - activeBreakpoint lives in Zustand. It's read via useEditorStore which
//     subscribes independently.
//   - classString and inlineStyle are computed in the body (not the collector)
//     so they always reflect the LIVE activeBreakpoint. Otherwise the collector
//     closure captures activeBreakpoint at the previous Craft state change,
//     and edits at non-base breakpoints read stale data.
//
// Inline (arbitrary values) is read/written at base level only in Phase 4.5 —
// non-base breakpoints don't have an inline storage shape. The ColorPicker /
// NumericInput disable arbitrary entry at non-base via the `activeBreakpoint`
// return value, so writeInline is only called when activeBreakpoint === 'base'.
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
  const inlineStyle: Record<string, string> = style.inline?.[slot] ?? {}

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

  const writeInline = (cssProperty: string, value: string | undefined) => {
    actions.setProp(nodeId, (props: NodeProps) => {
      if (value === undefined) {
        // Clear: walk the nested objects backward, deleting empty containers.
        const slotMap = props.style.inline?.[slot]
        if (!slotMap) return
        delete slotMap[cssProperty]
        if (Object.keys(slotMap).length === 0) {
          delete props.style.inline![slot]
          if (Object.keys(props.style.inline!).length === 0) {
            delete props.style.inline
          }
        }
        return
      }
      if (!props.style.inline) props.style.inline = {}
      if (!props.style.inline[slot]) props.style.inline[slot] = {}
      props.style.inline[slot][cssProperty] = value
    })
  }

  return { classString, inlineStyle, writeClasses, writeInline, activeBreakpoint }
}
