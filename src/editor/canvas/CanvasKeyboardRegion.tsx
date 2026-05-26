import { useEditor } from '@craftjs/core'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useEditorStore } from '@/state/editorStore'

// Phase 9 Group D / PRODUCTION_READINESS § 1.4 — canvas keyboard navigation.
//
// The canvas region is a single tab stop. Arrow keys move the *selection*
// directly: pressing ArrowDown on a selected node selects the next node in
// pre-order, ArrowRight drills into the first child, ArrowLeft pops to the
// parent, etc. Selection (not a separate "focus" state) is the source of
// truth — the ResizeOverlay's dashed outline + 8 resize handles are the
// visual indicator, identical to mouse-driven selection.
//
// Why selection-only (no separate focus state):
//   - File managers / Figma's layers panel / IDE outline views all use
//     "arrow = move selection." Designers expect the same.
//   - A separate focus ring duplicates the ResizeOverlay's outline and
//     visually competes with it. With selection-only, the user always
//     sees one indicator.
//   - The keyboard caret IS the selection — pressing Enter is redundant,
//     so we don't define it (the Delete/Backspace + Escape handlers do
//     the heavy lifting).
//
// Keys handled (only while focus is inside the canvas region):
//   ArrowDown  — next node in pre-order (first child if any, else next
//                sibling, else next ancestor's sibling). Selects it.
//   ArrowUp    — previous node in pre-order (previous sibling's deepest
//                descendant, else parent). Selects it.
//   ArrowRight — first child if any, else next sibling.
//   ArrowLeft  — parent.
//   Escape     — clears selection AND returns focus to the wrapper.
//   Delete /
//   Backspace  — actions.delete(selectedId) (when not ROOT); selection
//                jumps to the next sibling, previous sibling, or parent.
//
// Selection itself lives in Craft.js's events.selected — this component
// just reads from it and writes via actions.selectNode().

interface NodeQueryShape {
  data: {
    parent: string | null | undefined
    nodes: string[] | undefined
    dom: HTMLElement | null
  }
}

export function CanvasKeyboardRegion({ children }: { children: ReactNode }) {
  // Subscribe to Craft's selection so the keydown handler always sees the
  // current id without having to re-query each press.
  const { actions, query, selectedNodeId } = useEditor((state) => {
    const ids = state.events.selected ? Array.from(state.events.selected) : []
    return { selectedNodeId: (ids[0] as string | undefined) ?? null }
  })
  const selectedNodeIdRef = useRef<string | null>(selectedNodeId)
  selectedNodeIdRef.current = selectedNodeId

  const containerRef = useRef<HTMLDivElement | null>(null)
  // Suppress the single auto-promotion that would otherwise re-select
  // ROOT when Escape moves focus to the wrapper.
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

  // Walk the next focusable node in depth-first pre-order. Returns null
  // when there's nothing after `id` (last node in tree).
  const nextInTree = useCallback(
    (id: string): string | null => {
      const node = getNode(id)
      if (!node) return null
      const children = node.data.nodes ?? []
      if (children.length > 0) return children[0]
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

  // Scroll the newly-selected node into view so the ResizeOverlay's outline
  // is visible after a long arrow run. ResizeOverlay positions on a fixed
  // overlay so the canvas's own overflow:auto handles scrolling.
  const ensureVisible = useCallback(
    (id: string) => {
      const dom = getNode(id)?.data.dom
      dom?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    },
    [getNode],
  )

  const select = useCallback(
    (id: string | null) => {
      if (id) {
        actions.selectNode(id)
        ensureVisible(id)
      } else {
        actions.selectNode()
      }
    },
    [actions, ensureVisible],
  )

  const handleContainerFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      // Only react when focus arrives on the wrapper itself (Tab from
      // outside). Focus entering a descendant doesn't match.
      if (e.target !== containerRef.current) return
      if (suppressNextPromotionRef.current) {
        suppressNextPromotionRef.current = false
        return
      }
      // No selection yet → select ROOT so the user has a visible starting
      // point. If something is already selected (mouse click before Tab),
      // leave it alone.
      if (!selectedNodeIdRef.current) {
        select('ROOT')
      }
    },
    [select],
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Form inputs inside a canvas node should handle their own arrows.
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return
        }
      }
      // Only act when focus is somewhere inside the canvas region.
      const active = document.activeElement
      if (!active || !containerRef.current?.contains(active)) return

      const selectedId = selectedNodeIdRef.current
      // For the navigation keys we need a starting node — fall back to
      // ROOT so a fresh Tab + ArrowDown does something useful.
      const startId = selectedId ?? 'ROOT'

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          const next = nextInTree(startId)
          if (next) select(next)
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          const prev = prevInTree(startId)
          if (prev) select(prev)
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          const child = firstChild(startId)
          if (child) select(child)
          else {
            const sib = nextSibling(startId)
            if (sib) select(sib)
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          const node = getNode(startId)
          const parentId = node?.data.parent
          if (parentId) select(parentId)
          break
        }
        case 'Escape': {
          if (!selectedId) return
          e.preventDefault()
          select(null)
          // Return focus to the wrapper so subsequent Tab leaves the
          // region — and suppress the wrapper's auto-promotion that
          // would otherwise re-select ROOT.
          suppressNextPromotionRef.current = true
          containerRef.current?.focus()
          break
        }
        case 'Delete':
        case 'Backspace': {
          // Phase 11 § 3.3 — delete EVERY node in editorStore.selection,
          // not just the keyboard-region's primary. Coalesce under one
          // history rate so the whole multi-delete is one undo step.
          const selection = useEditorStore.getState().selection
          const deletable = selection.filter((id) => {
            try {
              return !query.node(id).isRoot()
            } catch {
              return false
            }
          })
          if (deletable.length === 0) return
          e.preventDefault()
          // Decide the next selection from the FIRST deletable node's
          // neighborhood — prefer the next sibling (preserves reading
          // order), then previous sibling, then parent. Skip any
          // candidate that's itself in the to-delete set.
          const anchorId = deletable[0]
          const node = getNode(anchorId)
          const parentId = node?.data.parent ?? null
          let nextSelect: string | null = parentId
          if (parentId) {
            const parent = getNode(parentId)
            const siblings = parent?.data.nodes ?? []
            const toDeleteSet = new Set(deletable)
            const survivingAfter = siblings
              .slice(siblings.indexOf(anchorId) + 1)
              .find((s: string) => !toDeleteSet.has(s))
            const survivingBefore = siblings
              .slice(0, siblings.indexOf(anchorId))
              .reverse()
              .find((s: string) => !toDeleteSet.has(s))
            nextSelect = survivingAfter ?? survivingBefore ?? parentId
          }
          // history.throttle(0) coalesces synchronous calls into one
          // undo entry; we still delete in two passes (children first)
          // because Craft errors when you delete a node whose
          // descendant is in the to-delete set already (the descendant
          // is gone but we still target it). Sort by depth descending.
          const sorted = sortByDepthDesc(deletable, getNode)
          const throttled = actions.history.throttle(0)
          for (const id of sorted) {
            try {
              throttled.delete(id)
            } catch {
              // Node was already removed (could happen if a parent
              // got deleted first despite the sort). Ignore.
            }
          }
          // Clear the multi-selection so the Inspector / breadcrumbs
          // don't briefly point at dead ids. The next requestAnimationFrame
          // sets the survivor.
          useEditorStore.getState().clearSelection()
          requestAnimationFrame(() => select(nextSelect))
          break
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [
    actions,
    firstChild,
    getNode,
    nextInTree,
    nextSibling,
    prevInTree,
    select,
  ])

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="application"
      aria-label="Canvas — Arrow keys to navigate, Delete to remove, Escape to deselect"
      onFocus={handleContainerFocus}
      // Block with no extra styling so the canvas tree sizes itself
      // exactly like before.
      className="outline-none"
    >
      {children}
    </div>
  )
}

// Phase 11 § 3.3 — sort node ids by depth descending. Deepest nodes
// come first so deleting them doesn't orphan parent references. Used
// by the multi-delete path to avoid Craft's "node not found" error
// when a parent in the to-delete set is removed before its child.
function sortByDepthDesc(
  ids: readonly string[],
  getNode: (id: string) => NodeQueryShape | null,
): string[] {
  const depth = (id: string): number => {
    let d = 0
    let cur: string | null | undefined = id
    while (cur) {
      const n = getNode(cur)
      cur = n?.data.parent ?? null
      if (cur) d++
      if (d > 1024) break // pathological loop guard
    }
    return d
  }
  return [...ids].sort((a, b) => depth(b) - depth(a))
}
