import { useEditor } from '@craftjs/core'
import { useMemo } from 'react'
import { useEditorStore } from '@/state/editorStore'
import type { NodeStyle } from '@/registry/types'
import {
  readBucketClasses,
  readBucketInline,
  writeBucketClasses,
  writeBucketInline,
} from '@/style/dimensions'

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
  // Phase 12 § 4.2 — the active (bp × state) quadrant. All reads/writes
  // below route to it via the dimensions dispatch helpers.
  const activeState = useEditorStore((s) => s.activeState)

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

  const readClass = (props: NodeProps): string =>
    readBucketClasses(props.style, slot, activeBreakpoint, activeState)

  const readInline = (props: NodeProps): Record<string, string> =>
    readBucketInline(props.style, slot, activeBreakpoint, activeState)

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
        // Initialize style for nodes that don't have one yet (Pattern B
        // canvas slots, etc.). Without this writeBucketClasses crashes
        // trying to mutate undefined.
        if (!props.style) props.style = { classes: {} }
        if (!props.style.classes) props.style.classes = {}
        writeBucketClasses(props.style, slot, activeBreakpoint, activeState, next)
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
        if (!props.style) props.style = { classes: {} }
        writeBucketInline(
          props.style,
          slot,
          activeBreakpoint,
          activeState,
          cssProperty,
          value,
        )
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
        readBucketInline(node.props.style, slot, activeBreakpoint, activeState)[
          cssProperty
        ] ?? ''
      const next = computeNext(current)
      throttled.setProp(node.id, (props: NodeProps) => {
        if (!props.style) props.style = { classes: {} }
        writeBucketInline(
          props.style,
          slot,
          activeBreakpoint,
          activeState,
          cssProperty,
          next || undefined,
        )
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
