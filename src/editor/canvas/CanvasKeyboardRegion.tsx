import { useEditor } from '@craftjs/core'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'

// Phase 9 Group D / PRODUCTION_READINESS § 1.4 — canvas keyboard navigation.
//
// The canvas region is a single tab stop. Inside the region the user navigates
// a tree of nodes with arrow keys; the currently-focused node carries the
// `data-canvas-focused` attribute (styled in index.css with an outline
// distinct from the dashed selection outline drawn by ResizeOverlay). Focus
// and selection are independent state — focus tracks the keyboard caret,
// selection is what the Inspector reflects. `Enter` promotes focus to
// selection.
//
// Why a ref-based focus tracker and not React state:
//   - The tree can grow / shrink (Hydrator restore, undo, document switch)
//     between renders. A React state would either lag the DOM or fight
//     Craft's own reconciliation.
//   - The visual focus ring is a DOM attribute; the only React thing we
//     need is for descendants to keep their tabindex=-1 setup, which
//     CanonicalNode handles on each render via its attachRef.
//
// Keys handled (only while a canvas node is the activeElement):
//   ArrowDown  — first child if any, else next sibling, else next ancestor's
//                next sibling.
//   ArrowUp    — previous sibling's deepest last descendant, else parent.
//   ArrowRight — first child if any, else next sibling (same as ArrowDown
//                without the ancestor-walk; matches tree-widget convention).
//   ArrowLeft  — parent.
//   Enter      — actions.selectNode(focusedId).
//   Escape     — clear selection AND blur back to the region container.
//   Delete /
//   Backspace  — actions.delete(focusedId) (when not ROOT); focus jumps to
//                the next sibling, previous sibling, or parent in that
//                preference order.

interface NodeQueryShape {
  data: {
    parent: string | null | undefined
    nodes: string[] | undefined
    dom: HTMLElement | null
  }
}

const FOCUS_ATTR = 'data-canvas-focused'

export function CanvasKeyboardRegion({ children }: { children: ReactNode }) {
  // Subscribe to Craft's selection so a mouse click is reflected in the
  // keyboard-focus pointer below — without this, arrow keys after a click
  // would resume from wherever the keyboard had previously been.
  const { actions, query, selectedNodeId } = useEditor((state) => {
    const ids = state.events.selected ? Array.from(state.events.selected) : []
    return { selectedNodeId: (ids[0] as string | undefined) ?? null }
  })
  const containerRef = useRef<HTMLDivElement | null>(null)
  // Focus state is held in a ref because changes are imperative (set DOM
  // attribute + .focus()); no need to trigger React re-renders.
  const focusedIdRef = useRef<string | null>(null)
  // Suppress the single auto-promotion that would otherwise happen when
  // Escape moves focus to the wrapper (the wrapper's onFocus would otherwise
  // bounce focus right back to ROOT). Consumed on the next focus event.
  const suppressNextPromotionRef = useRef(false)

  // Safe accessor — query.node throws when the id doesn't exist (e.g. after
  // a delete). Returning null lets callers handle the gap uniformly.
  const getNode = useCallback(
    (id: string): NodeQueryShape | null => {
      try {
        return query.node(id).get() as unknown as NodeQueryShape
      } catch {
        return null
      }
    },
    [query],
  )

  const setFocus = useCallback(
    (id: string | null) => {
      const prevId = focusedIdRef.current
      if (prevId && prevId !== id) {
        const prev = getNode(prevId)
        prev?.data.dom?.removeAttribute(FOCUS_ATTR)
      }
      focusedIdRef.current = id
      if (id) {
        const next = getNode(id)
        const dom = next?.data.dom
        if (dom) {
          dom.setAttribute(FOCUS_ATTR, '')
          // preventScroll keeps the inspector / toolbox stable when the user
          // navigates into off-screen nodes — the canvas auto-scrolls
          // (overflow: auto on <main>) without an additional jump.
          dom.focus({ preventScroll: false })
        }
      }
    },
    [getNode],
  )

  // Walk the next focusable node in a depth-first pre-order traversal.
  // Returns null when there's nothing after `id` (i.e., last node in tree).
  const nextInTree = useCallback(
    (id: string): string | null => {
      const node = getNode(id)
      if (!node) return null
      const children = node.data.nodes ?? []
      if (children.length > 0) return children[0]
      // Climb until we find an ancestor with a next sibling.
      let current = id
      while (true) {
        const cur = getNode(current)
        const parentId = cur?.data.parent
        if (!parentId) return null
        const parent = getNode(parentId)
        const siblings = parent?.data.nodes ?? []
        const idx = siblings.indexOf(current)
        if (idx >= 0 && idx < siblings.length - 1) return siblings[idx + 1]
        current = parentId
      }
    },
    [getNode],
  )

  // The pre-order "previous": deepest-last-descendant of previous sibling,
  // else parent. Mirrors nextInTree so Up/Down reach every node.
  const prevInTree = useCallback(
    (id: string): string | null => {
      const node = getNode(id)
      const parentId = node?.data.parent
      if (!parentId) return null
      const parent = getNode(parentId)
      const siblings = parent?.data.nodes ?? []
      const idx = siblings.indexOf(id)
      if (idx <= 0) return parentId
      // Walk down to the rightmost leaf of the previous sibling.
      let cursor = siblings[idx - 1]
      while (true) {
        const cur = getNode(cursor)
        const kids = cur?.data.nodes ?? []
        if (kids.length === 0) return cursor
        cursor = kids[kids.length - 1]
      }
    },
    [getNode],
  )

  const firstChild = useCallback(
    (id: string): string | null => {
      const node = getNode(id)
      const kids = node?.data.nodes ?? []
      return kids[0] ?? null
    },
    [getNode],
  )

  const nextSibling = useCallback(
    (id: string): string | null => {
      const node = getNode(id)
      const parentId = node?.data.parent
      if (!parentId) return null
      const parent = getNode(parentId)
      const siblings = parent?.data.nodes ?? []
      const idx = siblings.indexOf(id)
      if (idx < 0 || idx >= siblings.length - 1) return null
      return siblings[idx + 1]
    },
    [getNode],
  )

  // Clear focus on unmount so the next mount starts clean.
  useEffect(() => {
    return () => {
      const prevId = focusedIdRef.current
      if (prevId) {
        const prev = getNode(prevId)
        prev?.data.dom?.removeAttribute(FOCUS_ATTR)
      }
      focusedIdRef.current = null
    }
  }, [getNode])

  // Click-driven selection arrives via Craft's events.selected. Sync the
  // keyboard-focus pointer + visual ring without re-focusing (the click
  // already moved native focus). Without this the next ArrowDown would
  // resume from the previous keyboard position, not the clicked node.
  useEffect(() => {
    if (!selectedNodeId) return
    if (selectedNodeId === focusedIdRef.current) return
    const prevId = focusedIdRef.current
    if (prevId) {
      const prev = getNode(prevId)
      prev?.data.dom?.removeAttribute(FOCUS_ATTR)
    }
    focusedIdRef.current = selectedNodeId
    const next = getNode(selectedNodeId)
    next?.data.dom?.setAttribute(FOCUS_ATTR, '')
  }, [selectedNodeId, getNode])

  const handleContainerFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      // Only react when focus arrives on the wrapper itself (tab from outside).
      // Focus entering a descendant node will not match because e.target is
      // that descendant.
      if (e.target !== containerRef.current) return
      if (suppressNextPromotionRef.current) {
        // Escape just dropped us here intentionally — leave focus on the
        // wrapper so the user can Tab away cleanly.
        suppressNextPromotionRef.current = false
        return
      }
      const last = focusedIdRef.current
      const target = last && getNode(last) ? last : 'ROOT'
      setFocus(target)
    },
    [getNode, setFocus],
  )

  const handleContainerBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      // Strip focus state when the user leaves the region entirely (e.g.,
      // Tab to the Inspector). Movement within the region still leaves the
      // attribute on the active node.
      const next = e.relatedTarget as Node | null
      if (next && containerRef.current?.contains(next)) return
      const id = focusedIdRef.current
      if (id) {
        const node = getNode(id)
        node?.data.dom?.removeAttribute(FOCUS_ATTR)
      }
      focusedIdRef.current = null
    },
    [getNode],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Form inputs inside a canvas node should handle their own arrow keys.
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      const focusedId = focusedIdRef.current
      if (!focusedId) return

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          const next = nextInTree(focusedId)
          if (next) setFocus(next)
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          const prev = prevInTree(focusedId)
          if (prev) setFocus(prev)
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          const child = firstChild(focusedId)
          if (child) setFocus(child)
          else {
            const sib = nextSibling(focusedId)
            if (sib) setFocus(sib)
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          const node = getNode(focusedId)
          const parentId = node?.data.parent
          if (parentId) setFocus(parentId)
          break
        }
        case 'Enter':
        case ' ': {
          e.preventDefault()
          actions.selectNode(focusedId)
          break
        }
        case 'Escape': {
          e.preventDefault()
          // Empty selection — Craft.js accepts undefined to clear.
          actions.selectNode()
          // Clear our focus state + visual ring.
          setFocus(null)
          // Return focus to the wrapper so subsequent Tab leaves the region.
          // The handleContainerFocus auto-promotion would normally bounce
          // focus back to ROOT; suppress that single tick.
          suppressNextPromotionRef.current = true
          containerRef.current?.focus()
          break
        }
        case 'Delete':
        case 'Backspace': {
          if (focusedId === 'ROOT') return // ROOT can't be deleted.
          e.preventDefault()
          // Pre-compute the focus destination before delete: next sibling
          // (preserves reading order), else previous sibling, else parent.
          const node = getNode(focusedId)
          const parentId = node?.data.parent ?? null
          let nextFocus: string | null = parentId
          if (parentId) {
            const parent = getNode(parentId)
            const siblings = parent?.data.nodes ?? []
            const idx = siblings.indexOf(focusedId)
            if (idx >= 0 && idx < siblings.length - 1) {
              nextFocus = siblings[idx + 1]
            } else if (idx > 0) {
              nextFocus = siblings[idx - 1]
            }
          }
          actions.delete(focusedId)
          // Schedule on the next tick so Craft's reconciliation lands and
          // the destination node's DOM is rendered before we call .focus().
          requestAnimationFrame(() => setFocus(nextFocus))
          break
        }
      }
    },
    [
      actions,
      firstChild,
      getNode,
      nextInTree,
      nextSibling,
      prevInTree,
      setFocus,
    ],
  )

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="application"
      aria-label="Canvas — Arrow keys to navigate, Enter to select, Delete to remove"
      onFocus={handleContainerFocus}
      onBlur={handleContainerBlur}
      onKeyDown={handleKeyDown}
      className="contents focus:outline-none"
    >
      {children}
    </div>
  )
}
