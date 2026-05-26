import { useEditor } from '@craftjs/core'
import { useCallback, useEffect, useState } from 'react'
import { useEditorStore } from '@/state/editorStore'

// Phase 11 § 3.3 — dashed outline overlay for every non-primary
// selected node. The ResizeOverlay only paints the primary (it
// also owns the 8 resize handles); without this companion the
// later modifier-clicked nodes had no visual indicator that they
// were part of the multi-selection.
//
// One outline per secondary id. Each tracks its own rect via the
// same scroll / resize / ResizeObserver triggers ResizeOverlay
// uses, so dashed outlines stay glued to the nodes through
// scrolling and window resizes.

export function SecondarySelectionOutlines() {
  // Subscribe to the stable selection array and slice in the
  // component body. A selector that returns `selection.slice(1)`
  // creates a new array on every invocation; zustand's Object.is
  // comparator sees that as a change and triggers a re-render,
  // which calls the selector again — infinite loop ("Maximum update
  // depth exceeded"). The full array IS reference-stable across
  // unchanged renders, so subscribing to it is safe.
  const selection = useEditorStore((s) => s.selection)
  const secondaryIds = selection.slice(1)
  if (secondaryIds.length === 0) return null
  return (
    <>
      {secondaryIds.map((id) => (
        <NodeOutline key={id} nodeId={id} />
      ))}
    </>
  )
}

function NodeOutline({ nodeId }: { nodeId: string }) {
  // Resolve the node's DOM through Craft's query. Note this hook
  // re-runs only when the id changes (the prop key churn from the
  // parent ensures one component per id), but the DOM ref itself
  // can change when adapters swap — we re-read on every recompute
  // through the query closure rather than caching it in state.
  const { dom } = useEditor((_state, query) => {
    try {
      return { dom: (query.node(nodeId).get().dom as HTMLElement) ?? null }
    } catch {
      return { dom: null }
    }
  })

  const [rect, setRect] = useState<DOMRect | null>(null)

  const recompute = useCallback(() => {
    if (!dom) {
      setRect(null)
      return
    }
    setRect(dom.getBoundingClientRect())
  }, [dom])

  useEffect(() => {
    recompute()
    if (!dom) return
    const observer = new ResizeObserver(recompute)
    observer.observe(dom)
    window.addEventListener('scroll', recompute, {
      capture: true,
      passive: true,
    })
    window.addEventListener('resize', recompute, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', recompute, { capture: true })
      window.removeEventListener('resize', recompute)
    }
  }, [dom, recompute])

  if (!rect || !dom) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-40"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        outline: '1.5px dashed var(--primary)',
        outlineOffset: '2px',
        // Slightly more subdued than the primary's outline so users
        // can still tell which node is "primary" (handles render at
        // z-50 with the same color; this sits at z-40).
        opacity: 0.7,
      }}
    />
  )
}
