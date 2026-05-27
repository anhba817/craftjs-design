import { useEditor } from '@craftjs/core'
import { useMemo } from 'react'
import { useEditorStore } from '@/state/editorStore'
import type { NodeStyle } from '@/registry/types'

type NodeProps = { style: NodeStyle }

/**
 * Multi-node variant of {@link useNodeClasses}. Returns per-node
 * classStrings + inlineStyles arrays in the order of `nodeIds`, plus
 * write helpers that fan out to every node atomically (one undo step).
 *
 * Used by the Inspector's style panels when the user multi-selects
 * nodes. Single-node consumers should keep using
 * {@link useNodeClasses} — it's a thin wrapper over this hook for the
 * common case.
 *
 * Mixed-value detection lives in the panel (callers compare the
 * returned arrays element-wise). The hook itself doesn't merge; that
 * decision needs the panel's parser to know which "group" a class
 * belongs to (e.g. `p-4 m-2` vs `m-2 p-4` should be considered
 * equal for spacing). Panels typically:
 *
 *   const tokens = classStrings.map(cs => parseFoo(cs).slice[key])
 *   const isMixed = tokens.some(t => t !== tokens[0])
 *
 * Writes coalesce via Craft's history throttle: calling
 * writeClassesAll within ~500ms registers one undo entry even though
 * it dispatches N setProp actions.
 */
export function useNodeClassesMulti(
  nodeIds: readonly string[],
  slot: string = 'root',
) {
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint)

  // Subscribe by reference to Craft's nodes map. The ref is stable
  // across selectNode (which only mutates events.selected, not
  // nodes), so arrow-key navigation doesn't trigger this hook to
  // re-render its consumers — only setProp / add / remove / move
  // do. With 7 inspector panels each using this hook, the
  // alternative (collector that returns a fresh `{perNode: [...]}`
  // each call) was re-rendering every panel on every selectNode
  // and dragging keyboard nav perceptibly.
  const { actions, nodes } = useEditor((state) => ({ nodes: state.nodes }))
  const perNode = useMemo(() => {
    const items: Array<{ id: string; props: NodeProps }> = []
    for (const id of nodeIds) {
      const node = nodes?.[id]
      if (node) {
        items.push({ id, props: node.data.props as NodeProps })
      }
    }
    return items
  }, [nodes, nodeIds])

  const readClass = (props: NodeProps): string => {
    const style = props.style
    return activeBreakpoint === 'base'
      ? (style.classes?.[slot] ?? '')
      : (style.responsive?.[activeBreakpoint]?.[slot] ?? '')
  }

  const readInline = (props: NodeProps): Record<string, string> => {
    const style = props.style
    return activeBreakpoint === 'base'
      ? (style.inline?.[slot] ?? {})
      : (style.responsiveInline?.[activeBreakpoint]?.[slot] ?? {})
  }

  const classStrings = perNode.map((n) => readClass(n.props))
  const inlineStyles = perNode.map((n) => readInline(n.props))

  /**
   * Compute a new class string for each node from its current one,
   * then write atomically via a single throttled history rate so
   * the multi-node edit is one undo step. The transform receives
   * each node's CURRENT class string (so it can preserve unrelated
   * tokens) and returns the next string.
   */
  const writeClassesAll = (transform: (current: string) => string) => {
    const throttled = actions.history.throttle(500)
    for (const node of perNode) {
      const current = readClass(node.props)
      const next = transform(current)
      throttled.setProp(node.id, (props: NodeProps) => {
        if (activeBreakpoint === 'base') {
          props.style.classes[slot] = next
        } else {
          if (!props.style.responsive) props.style.responsive = {}
          if (!props.style.responsive[activeBreakpoint]) {
            props.style.responsive[activeBreakpoint] = {}
          }
          props.style.responsive[activeBreakpoint][slot] = next
        }
      })
    }
  }

  /**
   * Write the same inline value to every selected node's slot. Same
   * throttle-coalescing as writeClassesAll → one undo step.
   */
  const writeInlineAll = (
    cssProperty: string,
    value: string | undefined,
  ) => {
    const throttled = actions.history.throttle(500)
    for (const node of perNode) {
      throttled.setProp(node.id, (props: NodeProps) => {
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
  }

  /**
   * Phase 12 — per-node inline write. Unlike writeInlineAll (same
   * value to every node), this reads EACH node's current value for
   * `cssProperty` and computes its next value via `computeNext`. Used
   * by the Transforms / Filters panels, where the property is a
   * composed function list (`transform`, `filter`) and setting one
   * function must preserve each node's other functions independently.
   */
  const writeInlineFn = (
    cssProperty: string,
    computeNext: (current: string) => string,
  ) => {
    const throttled = actions.history.throttle(500)
    for (const node of perNode) {
      const current =
        (activeBreakpoint === 'base'
          ? node.props.style.inline?.[slot]?.[cssProperty]
          : node.props.style.responsiveInline?.[activeBreakpoint]?.[slot]?.[
              cssProperty
            ]) ?? ''
      const next = computeNext(current)
      throttled.setProp(node.id, (props: NodeProps) => {
        if (activeBreakpoint === 'base') {
          writeBaseInline(props, slot, cssProperty, next || undefined)
        } else {
          writeResponsiveInline(
            props,
            activeBreakpoint,
            slot,
            cssProperty,
            next || undefined,
          )
        }
      })
    }
  }

  return {
    classStrings,
    inlineStyles,
    writeClassesAll,
    writeInlineAll,
    writeInlineFn,
    activeBreakpoint,
  }
}

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
