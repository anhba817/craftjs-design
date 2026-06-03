import { useEditor } from '@craftjs/core'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { mergeSize } from '@/style/tw-classes'
import type { SizeValue } from '@/style/tw-classes'
import { getComponentByDisplayName } from '@/registry/registry'
import type { NodeStyle } from '@/registry/types'
import { useEditorStore } from '@/state/editorStore'
import { snapToSizeToken } from './snap'

type NodeProps = { style: NodeStyle }

// 8 handles — 4 corners (both axes) + 4 edges (single axis). Axis vectors
// drive both the drag math and the snap dispatch: 0 = "this axis doesn't
// change on this handle"; ±1 = "drag in this direction increases the
// dimension." Top/left handles invert because dragging up/left extends the
// element backwards from the user's perspective.
type HandleKind = 'tl' | 't' | 'tr' | 'l' | 'r' | 'bl' | 'b' | 'br'

const HANDLE_AXES: Record<HandleKind, { x: -1 | 0 | 1; y: -1 | 0 | 1 }> = {
  tl: { x: -1, y: -1 },
  t: { x: 0, y: -1 },
  tr: { x: 1, y: -1 },
  l: { x: -1, y: 0 },
  r: { x: 1, y: 0 },
  bl: { x: -1, y: 1 },
  b: { x: 0, y: 1 },
  br: { x: 1, y: 1 },
}

const HANDLE_POSITION: Record<HandleKind, React.CSSProperties> = {
  tl: { left: -5, top: -5, cursor: 'nwse-resize' },
  t: { left: 'calc(50% - 5px)', top: -5, cursor: 'ns-resize' },
  tr: { right: -5, top: -5, cursor: 'nesw-resize' },
  l: { left: -5, top: 'calc(50% - 5px)', cursor: 'ew-resize' },
  r: { right: -5, top: 'calc(50% - 5px)', cursor: 'ew-resize' },
  bl: { left: -5, bottom: -5, cursor: 'nesw-resize' },
  b: { left: 'calc(50% - 5px)', bottom: -5, cursor: 'ns-resize' },
  br: { right: -5, bottom: -5, cursor: 'nwse-resize' },
}

const ALL_HANDLES: readonly HandleKind[] = [
  'tl',
  't',
  'tr',
  'l',
  'r',
  'bl',
  'b',
  'br',
]

// Phase 7 + 8 — canvas-overlay drag-resize.
//
// Architecture:
//   - Subscribes to Craft's selection state. When a node is selected, fetches
//     the node's DOM via query.node(id).get().dom and positions an overlay
//     <div> at the same viewport rect using `position: fixed`.
//   - getBoundingClientRect() is re-read on selection change, window resize,
//     scroll (capture phase to catch nested scrollers), and ResizeObserver
//     ticks on the node's DOM.
//   - 8 handles (Phase 8): 4 corners (both axes) + 4 edges (single axis).
//     Each handle's axis vector drives the drag math AND the snap dispatch.
//   - Mousedown captures pointer coords + starting width/height; mousemove
//     mutates `dom.style.width/height` directly (no React render → smooth
//     60fps); mouseup commits the final size.
//   - Snap-to-token (Phase 8): if the final rendered size is within 4px of
//     a Tailwind size token (w-32 = 128px, w-48 = 192px, etc.), the commit
//     writes a `w-<token>` / `h-<token>` class AND clears the inline px.
//     Otherwise inline px persists. Only axes the handle controls get
//     touched — dragging a vertical edge handle never touches width.
//
// Craft drag-connector conflict: handles live in their own React subtree
// outside the Craft <Frame>, so Craft's per-node mousedown listeners never
// see the handle's pointer events. e.stopPropagation() on the handle is a
// belt-and-suspenders guard against any document-level Craft listener.
export function ResizeOverlay() {
  // Phase 11 § 3.3 — read the primary selection from editorStore (not
  // Craft directly) so multi-select keeps the resize handles scoped
  // to the FIRST selected node. Multi-resize (gang-resize) is a
  // Phase 12+ stretch; v1 scopes to primary only.
  const primaryId = useEditorStore((s) => s.selection[0] ?? null)
  const {
    actions,
    selectedId,
    selectedDom,
    styleKey,
    hasStyle,
    canResize,
  } = useEditor((_state, query) => {
    if (!primaryId) {
      return {
        selectedId: null,
        selectedDom: null,
        styleKey: '',
        hasStyle: false,
        canResize: true,
      }
    }
    let dom: HTMLElement | null = null
    let styleKey = ''
    let hasStyle = false
    let canResize = true
    try {
      const node = query.node(primaryId).get()
      dom = node.dom
      // Phase 12 — a style signature so the overlay recomputes when
      // the selected node's style changes.
      const style = (node.data.props as { style?: unknown }).style
      hasStyle = !!style && typeof style === 'object'
      styleKey = JSON.stringify(style ?? null)
      // Phase 13 § 5.1 — canonicals can opt out of the 8-handle resize
      // overlay (e.g. table-cell, where size comes from the parent
      // Table's colWidths / rowHeights). The selection outline still
      // renders so the user can see what's selected.
      const displayName = (node.data.displayName as string) || ''
      const def = getComponentByDisplayName(displayName)
      if (def && def.canResize === false) canResize = false
    } catch {
      // Node may have been removed mid-render — treat as no DOM.
    }
    return {
      selectedId: primaryId,
      selectedDom: dom,
      styleKey,
      hasStyle,
      canResize,
    }
  })

  const [rect, setRect] = useState<DOMRect | null>(null)
  // Phase 9 Group C — keep the overlay's size in lock-step with the dragged
  // node via direct DOM mutation. Without this every mousemove triggers a
  // ResizeObserver tick → setRect → React render of ResizeOverlay + 8
  // Handles. Baseline measurement showed 568 renders per resize gesture
  // (see PERFORMANCE.md Flow 9).
  const overlayRef = useRef<HTMLDivElement | null>(null)
  // True between mousedown and mouseup on a handle. While true, recompute()
  // skips setRect — the overlay's size is being managed directly by
  // onMouseMove instead.
  const isResizingRef = useRef(false)

  const recompute = useCallback(() => {
    if (isResizingRef.current) return // Drag is steering the overlay directly.
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

    window.addEventListener('scroll', recompute, { capture: true, passive: true })
    window.addEventListener('resize', recompute, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', recompute, { capture: true })
      window.removeEventListener('resize', recompute)
    }
  }, [selectedDom, recompute])

  // Phase 12 — recompute when the selected node's style changes (e.g. a
  // transform that ResizeObserver can't see). useLayoutEffect so the
  // overlay repositions in the same frame as the node's transform,
  // before paint — no flicker. getBoundingClientRect forces a synchronous
  // style/layout flush, so it reflects the just-committed transform class.
  useLayoutEffect(() => {
    recompute()
    // styleKey is the dependency that matters; recompute is stable per
    // selectedDom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleKey])

  // Skip nodes without a `style` shape (Pattern B canvas slots like Table
  // cells are plain Craft Elements with no NodeStyle — there's nothing to
  // size, and the resize recipe would crash reading `style.inline`).
  if (!rect || !selectedDom || !selectedId || !hasStyle) return null

  const startResize = (handle: HandleKind) => (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    isResizingRef.current = true

    const axes = HANDLE_AXES[handle]
    const startX = e.clientX
    const startY = e.clientY
    const startW = selectedDom.offsetWidth
    const startH = selectedDom.offsetHeight

    const onMouseMove = (mv: MouseEvent) => {
      const newW =
        axes.x === 0
          ? startW
          : Math.max(20, startW + (mv.clientX - startX) * axes.x)
      const newH =
        axes.y === 0
          ? startH
          : Math.max(20, startH + (mv.clientY - startY) * axes.y)
      const wPx = `${Math.round(newW)}px`
      const hPx = `${Math.round(newH)}px`
      // Direct DOM mutation during drag — neither React render nor a
      // Craft.js dispatch fires per tick. The final value commits via
      // setProp on mouseup.
      if (axes.x !== 0) selectedDom.style.width = wPx
      if (axes.y !== 0) selectedDom.style.height = hPx
      // Keep the overlay sized to the node. Without this the overlay's
      // outline would lag a frame behind the node — same direct-DOM
      // pattern the node itself uses.
      const overlay = overlayRef.current
      if (overlay) {
        if (axes.x !== 0) overlay.style.width = wPx
        if (axes.y !== 0) overlay.style.height = hPx
      }
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      isResizingRef.current = false

      const finalW = selectedDom.offsetWidth
      const finalH = selectedDom.offsetHeight

      // Snap dispatch — per axis the handle controlled. Token match wins
      // (writes the size class, clears inline px); no match → inline px.
      const widthToken = axes.x !== 0 ? snapToSizeToken(finalW) : null
      const heightToken = axes.y !== 0 ? snapToSizeToken(finalH) : null

      actions.setProp(selectedId, (props: NodeProps) => {
        if (!props.style.inline) props.style.inline = {}
        if (!props.style.inline.root) props.style.inline.root = {}
        const classRoot = props.style.classes.root ?? ''
        let nextClasses = classRoot

        if (axes.x !== 0) {
          if (widthToken !== null) {
            delete props.style.inline.root.width
            nextClasses = mergeSize(nextClasses, {
              w: widthToken as SizeValue,
            })
          } else {
            props.style.inline.root.width = `${finalW}px`
            nextClasses = mergeSize(nextClasses, { w: undefined })
          }
        }
        if (axes.y !== 0) {
          if (heightToken !== null) {
            delete props.style.inline.root.height
            nextClasses = mergeSize(nextClasses, {
              h: heightToken as SizeValue,
            })
          } else {
            props.style.inline.root.height = `${finalH}px`
            nextClasses = mergeSize(nextClasses, { h: undefined })
          }
        }
        if (nextClasses !== classRoot) {
          props.style.classes.root = nextClasses
        }
      })

      // Sync React state to the final DOM size in one commit. The
      // ResizeObserver tick that follows the setProp commit will also
      // fire recompute(); both setRect calls land on the same value
      // (React bails out the second) so this is at most one extra
      // render per gesture.
      recompute()
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      ref={overlayRef}
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
      {canResize &&
        ALL_HANDLES.map((kind) => (
          <Handle key={kind} kind={kind} onMouseDown={startResize(kind)} />
        ))}
    </div>
  )
}

function Handle({
  kind,
  onMouseDown,
}: {
  kind: HandleKind
  onMouseDown: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="pointer-events-auto absolute h-2.5 w-2.5 rounded-sm border border-ed-accent bg-ed-surface"
      style={HANDLE_POSITION[kind]}
    />
  )
}
