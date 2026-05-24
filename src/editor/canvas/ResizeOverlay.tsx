import { useEditor } from '@craftjs/core'
import { useCallback, useEffect, useState } from 'react'
import type { NodeStyle } from '@/registry/types'

type NodeProps = { style: NodeStyle }

type Corner = 'tl' | 'tr' | 'bl' | 'br'

// Phase 7 — canvas-overlay drag-resize. Replaces the Inspector ResizeToggle.
//
// Architecture:
//   - Subscribes to Craft's selection state. When a node is selected, fetches
//     the node's DOM via query.node(id).get().dom and positions an overlay
//     <div> at the same viewport rect using `position: fixed`.
//   - getBoundingClientRect() is re-read on selection change, window resize,
//     scroll (capture phase to catch nested scrollers), and ResizeObserver
//     ticks on the node's DOM.
//   - Four corner handles. Mousedown on a handle captures pointer coords +
//     starting width/height; mousemove mutates `dom.style.width/height`
//     directly (no React render → smooth 60fps); mouseup commits the final
//     size via setProp into style.inline.root.
//
// Craft drag-connector conflict: handles live in their own React subtree
// outside the Craft <Frame>, so Craft's per-node mousedown listeners never
// see the handle's pointer events. e.stopPropagation() on the handle is a
// belt-and-suspenders guard against any document-level Craft listener.
export function ResizeOverlay() {
  const { actions, selectedId, selectedDom } = useEditor((state, query) => {
    const ids = state.events.selected ? Array.from(state.events.selected) : []
    const id = ids[0]
    if (!id) return { selectedId: null, selectedDom: null }
    let dom: HTMLElement | null = null
    try {
      dom = query.node(id).get().dom
    } catch {
      // Node may have been removed mid-render — treat as no DOM.
    }
    return { selectedId: id, selectedDom: dom }
  })

  const [rect, setRect] = useState<DOMRect | null>(null)

  const recompute = useCallback(() => {
    if (!selectedDom) {
      setRect(null)
      return
    }
    setRect(selectedDom.getBoundingClientRect())
  }, [selectedDom])

  useEffect(() => {
    recompute()
    if (!selectedDom) return

    const observer = new ResizeObserver(recompute)
    observer.observe(selectedDom)

    // Capture phase catches scroll on nested scrollers (the canvas <main>
    // scrolls independently of window). Passive: we don't preventDefault.
    window.addEventListener('scroll', recompute, { capture: true, passive: true })
    window.addEventListener('resize', recompute, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', recompute, { capture: true })
      window.removeEventListener('resize', recompute)
    }
  }, [selectedDom, recompute])

  if (!rect || !selectedDom || !selectedId) return null

  const startResize = (corner: Corner) => (e: React.MouseEvent) => {
    // Belt-and-suspenders: block bubble + any per-document capture listener
    // Craft might own. The handle isn't inside a Craft node, so this is
    // defensive rather than load-bearing.
    e.stopPropagation()
    e.preventDefault()

    const startX = e.clientX
    const startY = e.clientY
    const startW = selectedDom.offsetWidth
    const startH = selectedDom.offsetHeight

    // Direction: positive when dragging a right/bottom edge; negative for
    // left/top (so dragging the left handle to the LEFT increases width).
    const dirX = corner.includes('r') ? 1 : -1
    const dirY = corner.includes('b') ? 1 : -1

    const onMouseMove = (mv: MouseEvent) => {
      const newW = Math.max(20, startW + (mv.clientX - startX) * dirX)
      const newH = Math.max(20, startH + (mv.clientY - startY) * dirY)
      // Direct DOM mutation during drag. React doesn't track these inline
      // style writes; the final value is committed via setProp on mouseup,
      // and React's next render re-applies the same value through its style
      // prop pipeline.
      selectedDom.style.width = `${Math.round(newW)}px`
      selectedDom.style.height = `${Math.round(newH)}px`
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      const finalW = selectedDom.offsetWidth
      const finalH = selectedDom.offsetHeight

      actions.setProp(selectedId, (props: NodeProps) => {
        if (!props.style.inline) props.style.inline = {}
        if (!props.style.inline.root) props.style.inline.root = {}
        props.style.inline.root.width = `${finalW}px`
        props.style.inline.root.height = `${finalH}px`
      })
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // The outer overlay has pointer-events:none so it doesn't block clicks on
  // anything beneath it. Handles individually opt back in.
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-50"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        outline: '1.5px dashed var(--primary)',
        outlineOffset: '2px',
      }}
    >
      <Handle corner="tl" onMouseDown={startResize('tl')} />
      <Handle corner="tr" onMouseDown={startResize('tr')} />
      <Handle corner="bl" onMouseDown={startResize('bl')} />
      <Handle corner="br" onMouseDown={startResize('br')} />
    </div>
  )
}

const CORNER_POSITION: Record<Corner, React.CSSProperties> = {
  tl: { left: -5, top: -5, cursor: 'nwse-resize' },
  tr: { right: -5, top: -5, cursor: 'nesw-resize' },
  bl: { left: -5, bottom: -5, cursor: 'nesw-resize' },
  br: { right: -5, bottom: -5, cursor: 'nwse-resize' },
}

function Handle({
  corner,
  onMouseDown,
}: {
  corner: Corner
  onMouseDown: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="pointer-events-auto absolute h-2.5 w-2.5 rounded-sm border border-primary bg-background"
      style={CORNER_POSITION[corner]}
    />
  )
}
