import { useEditor } from '@craftjs/core'
import { useEditorStore } from '@/state/editorStore'
import type { NodeStyle } from '@/registry/types'

type NodeProps = { style: NodeStyle }

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
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint)

  const { actions, props } = useEditor((_, q) => {
    return { props: q.node(nodeId).get().data.props as NodeProps }
  })

  const style = props.style
  const classString =
    activeBreakpoint === 'base'
      ? style.classes?.[slot] ?? ''
      : style.responsive?.[activeBreakpoint]?.[slot] ?? ''
  const inlineStyle: Record<string, string> =
    activeBreakpoint === 'base'
      ? (style.inline?.[slot] ?? {})
      : (style.responsiveInline?.[activeBreakpoint]?.[slot] ?? {})

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
      if (activeBreakpoint === 'base') {
        writeBaseInline(props, slot, cssProperty, value)
      } else {
        writeResponsiveInline(
          props,
          activeBreakpoint,
          slot,
          cssProperty,
          value,
        )
      }
    })
  }

  return { classString, inlineStyle, writeClasses, writeInline, activeBreakpoint }
}

// Base-breakpoint inline writes walk style.inline[slot][cssProp]. On clear,
// peel back empty containers so the saved document stays compact.
function writeBaseInline(
  props: NodeProps,
  slot: string,
  cssProperty: string,
  value: string | undefined,
): void {
  if (value === undefined) {
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
}

// Non-base inline writes walk style.responsiveInline[bp][slot][cssProp]. Same
// container-peel discipline as the base path.
function writeResponsiveInline(
  props: NodeProps,
  bp: string,
  slot: string,
  cssProperty: string,
  value: string | undefined,
): void {
  if (value === undefined) {
    const slotMap = props.style.responsiveInline?.[bp]?.[slot]
    if (!slotMap) return
    delete slotMap[cssProperty]
    if (Object.keys(slotMap).length === 0) {
      delete props.style.responsiveInline![bp][slot]
      if (Object.keys(props.style.responsiveInline![bp]).length === 0) {
        delete props.style.responsiveInline![bp]
        if (Object.keys(props.style.responsiveInline!).length === 0) {
          delete props.style.responsiveInline
        }
      }
    }
    return
  }
  if (!props.style.responsiveInline) props.style.responsiveInline = {}
  if (!props.style.responsiveInline[bp]) props.style.responsiveInline[bp] = {}
  if (!props.style.responsiveInline[bp][slot]) {
    props.style.responsiveInline[bp][slot] = {}
  }
  props.style.responsiveInline[bp][slot][cssProperty] = value
}
