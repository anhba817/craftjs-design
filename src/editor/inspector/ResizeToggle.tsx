import { useEditor } from '@craftjs/core'
import { Move } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { NodeStyle } from '@/registry/types'

type NodeProps = { style: NodeStyle }

// Drag-to-resize via the browser's native `resize: both` CSS property. The
// user toggles "Resize" on, the selected node's outer DOM grows a corner
// handle, drag-resize works natively. Toggling off (or selecting a different
// node) reads the current rendered size and commits it to
// style.inline.root.width / .height.
//
// Trade-offs:
//   - Relies on native CSS resize. Works on block elements; silently ignored
//     on inline elements (raw <span> text). The toggle still works visually
//     for the user; it just won't accept the drag on inline nodes.
//   - The toggle is explicit (not always-on) to avoid stealing mousedowns
//     that Craft uses for its drag connector. While resize mode is on, the
//     node can't be dragged to reposition it — user toggles off to drag.
export function ResizeToggle({ nodeId }: { nodeId: string }) {
  const [active, setActive] = useState(false)

  const { actions, dom } = useEditor((_state, query) => {
    let dom: HTMLElement | null = null
    try {
      dom = query.node(nodeId).get().dom
    } catch {
      // Node may have been removed mid-render. Treat as no DOM.
    }
    return { dom }
  })

  useEffect(() => {
    if (!active || !dom) return

    const saved = {
      resize: dom.style.resize,
      overflow: dom.style.overflow,
      minWidth: dom.style.minWidth,
      minHeight: dom.style.minHeight,
      outline: dom.style.outline,
      outlineOffset: dom.style.outlineOffset,
    }

    dom.style.resize = 'both'
    dom.style.overflow = 'auto'
    dom.style.minWidth = '1.5rem'
    dom.style.minHeight = '1.5rem'
    dom.style.outline = '2px dashed var(--primary)'
    dom.style.outlineOffset = '2px'

    return () => {
      const w = Math.round(dom.offsetWidth)
      const h = Math.round(dom.offsetHeight)

      // Restore visuals BEFORE committing — so the brief commit-rerender
      // doesn't flash with the dashed outline still on.
      Object.assign(dom.style, saved)

      actions.setProp(nodeId, (props: NodeProps) => {
        if (!props.style.inline) props.style.inline = {}
        if (!props.style.inline.root) props.style.inline.root = {}
        props.style.inline.root.width = `${w}px`
        props.style.inline.root.height = `${h}px`
      })
    }
  }, [active, dom, nodeId, actions])

  return (
    <button
      type="button"
      onClick={() => setActive(!active)}
      className={cn(
        'flex w-full items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-xs transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-gray-300 text-gray-600 hover:bg-gray-50',
      )}
    >
      <Move size={12} />
      {active ? 'Apply size & exit' : 'Drag-resize on canvas'}
    </button>
  )
}
