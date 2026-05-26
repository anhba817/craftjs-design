import { useEditor } from '@craftjs/core'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useEditorStore } from '@/state/editorStore'
import { buildTreeShape, wouldCreateCycle } from './buildTreeShape'
import type { NodeReader, TreeNodeShape } from './buildTreeShape'

// Phase 11 § 3.4 — Layer Tree.
//
// Renders the document's node tree as a flat, indented list of
// rows. The flat shape comes from buildTreeShape; rendering picks
// between a plain DOM list and a TanStack virtualizer based on a
// row-count threshold so small documents pay zero virtualization
// overhead while large ones stay smooth.
//
// Selection: each row reflects editorStore.selection. Click selects;
// Cmd/Ctrl-click toggles into multi-selection via the same
// editorStore primitives the canvas modifier-click handler uses.
//
// Drag-reorder: HTML5 DnD on each row. Drop above / below / inside
// a target row commits via actions.move under a single history
// throttle entry so one drag = one undo step. Cycle-creating drops
// are blocked (cursor flips to not-allowed).
//
// Collapse: chevron-toggle per row; collapsed ids live in component
// state, not persisted (resets per session).

const ROW_HEIGHT = 24
const VIRT_THRESHOLD = 50

// Drop position relative to the hovered target row. "inside" only
// applies when the target is a canvas node; "above"/"below"
// reparent into the target's parent.
type DropZone = 'above' | 'below' | 'inside' | null

interface DropState {
  targetId: string
  zone: DropZone
  forbidden: boolean
}

export function LayerTree() {
  const selection = useEditorStore((s) => s.selection)
  const { actions, query, treeVersion } = useEditor((state) => {
    // Subscribe to BOTH events.selected AND the nodes map so the
    // tree refreshes after add/delete/move. Using the node count is a
    // cheap signal — every add/delete changes it. Reorders within
    // the same set need a deeper signal; we subscribe to nodes
    // identity too (each setProp creates a new ref).
    return { treeVersion: state.nodes }
  })

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [dropState, setDropState] = useState<DropState | null>(null)

  // Build the flat row list. Recomputed whenever the tree changes
  // (treeVersion = state.nodes reference) or the collapse set changes.
  const rows = useMemo<TreeNodeShape[]>(() => {
    const reader: NodeReader = {
      getDisplayName: (id) => {
        try {
          return (
            (query.node(id).get().data.displayName as string) || id
          )
        } catch {
          return id
        }
      },
      getChildren: (id) => {
        try {
          return query.node(id).get().data.nodes ?? []
        } catch {
          return []
        }
      },
      getLinkedNodes: (id) => {
        try {
          return (
            (query.node(id).get().data.linkedNodes as Record<string, string>) ??
            {}
          )
        } catch {
          return {}
        }
      },
    }
    return buildTreeShape(reader, 'ROOT', collapsed)
    // treeVersion change forces recompute via the dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, treeVersion, query])

  // Quick lookup for "is this id selected" without scanning the
  // selection array per row.
  const selectionSet = useMemo(() => new Set(selection), [selection])

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const shouldVirtualize = rows.length > VIRT_THRESHOLD

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? rows.length : 0,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Phase 11 § 3.4 — container-level mousedown handler.
  //
  // Why mousedown and not click: when a row is `draggable=true`,
  // the browser may delay or suppress the click event depending on
  // tiny mouse movements between mousedown and mouseup (drag-prep
  // hysteresis). That manifested as an off-by-one selection bug
  // where the first click did nothing visible and subsequent
  // clicks appeared to select the PREVIOUS row's id. Mousedown
  // fires immediately on press, bypassing the drag-prep interaction
  // entirely. This is also what Craft's own canvas connector uses
  // for selection, so the layer-tree and canvas now behave
  // consistently.
  //
  // Row resolution: walks up from event.target to the nearest
  // `[data-layer-id]` so the id comes from the live DOM, not a
  // captured closure that might lag a render behind.
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    // Only react to the primary button. Right-click is right-click,
    // middle-click is ignored.
    if (e.button !== 0) return
    const target = e.target as HTMLElement | null
    if (!target) return
    // Chevron button stopPropagation()s its mousedown so this guard
    // is defensive belt-and-suspenders.
    if (target.closest('[data-chevron]')) return
    const rowEl = target.closest('[data-layer-id]') as HTMLElement | null
    if (!rowEl) return
    const id = rowEl.getAttribute('data-layer-id')
    if (!id) return
    const mod = e.metaKey || e.ctrlKey
    if (mod) {
      if (id === 'ROOT') return
      useEditorStore.getState().toggleSelection(id)
      const primary = useEditorStore.getState().selection[0]
      if (primary) actions.selectNode(primary)
      else actions.selectNode()
    } else {
      actions.selectNode(id)
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (id === 'ROOT') {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-craft-node-id', id)
  }

  const handleDragOver = (e: React.DragEvent, target: TreeNodeShape) => {
    const draggedId = e.dataTransfer.types.includes(
      'application/x-craft-node-id',
    )
      ? null
      : null
    void draggedId
    // We can't read dataTransfer.getData('…') during dragover — only
    // during drop. So we don't know the dragged id here; instead the
    // dragged element marks itself via a module-level ref.
    const dragged = currentDraggedIdRef.current
    if (!dragged) return

    // Determine zone by mouse Y relative to the row.
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const isCanvas = isCanvasNode(query, target.id)
    let zone: DropZone
    if (isCanvas && y > rect.height * 0.25 && y < rect.height * 0.75) {
      zone = 'inside'
    } else if (y < rect.height / 2) {
      zone = 'above'
    } else {
      zone = 'below'
    }

    // Forbidden checks: cycle, dragging onto self, ROOT moves.
    let forbidden = false
    if (dragged === target.id) forbidden = true
    if (target.id === 'ROOT' && zone !== 'inside') forbidden = true
    if (!forbidden) {
      const targetParentId =
        zone === 'inside' ? target.id : target.parentId ?? 'ROOT'
      const reader = makeReader(query)
      if (wouldCreateCycle(reader, dragged, targetParentId)) {
        forbidden = true
      }
    }

    e.preventDefault()
    e.dataTransfer.dropEffect = forbidden ? 'none' : 'move'
    setDropState({ targetId: target.id, zone, forbidden })
  }

  const handleDrop = (e: React.DragEvent, target: TreeNodeShape) => {
    e.preventDefault()
    const dragged = e.dataTransfer.getData('application/x-craft-node-id')
    currentDraggedIdRef.current = null
    setDropState(null)
    if (!dragged || dropState?.forbidden) return
    const zone = dropState?.zone
    if (!zone) return

    try {
      let targetParentId: string
      let targetIndex: number
      if (zone === 'inside') {
        targetParentId = target.id
        targetIndex = (query.node(target.id).get().data.nodes ?? []).length
      } else {
        targetParentId = target.parentId ?? 'ROOT'
        const siblings = query.node(targetParentId).get().data.nodes ?? []
        const targetIdx = siblings.indexOf(target.id)
        targetIndex = zone === 'above' ? targetIdx : targetIdx + 1
        // If we're moving WITHIN the same parent and the dragged node
        // was BEFORE the target, removing it shifts the target index
        // down by 1.
        const draggedNode = query.node(dragged).get()
        if (draggedNode.data.parent === targetParentId) {
          const draggedIdx = siblings.indexOf(dragged)
          if (draggedIdx >= 0 && draggedIdx < targetIdx) {
            targetIndex -= 1
          }
        }
      }
      // Single undo entry for the whole reorder.
      actions.history.throttle(0).move(dragged, targetParentId, targetIndex)
    } catch {
      // Craft rejected the move (canMoveIn/Out rules). Silent drop —
      // the visual cursor 'not-allowed' was the user-facing signal
      // for forbidden moves; rule-rejections are rarer.
    }
  }

  const handleDragEnd = () => {
    currentDraggedIdRef.current = null
    setDropState(null)
  }

  const renderRow = (row: TreeNodeShape) => {
    const isSelected = selectionSet.has(row.id)
    const isCollapsed = collapsed.has(row.id)
    const drop = dropState?.targetId === row.id ? dropState : null
    return (
      <LayerRow
        key={row.id}
        row={row}
        selected={isSelected}
        collapsed={isCollapsed}
        drop={drop}
        onChevronClick={() => toggleCollapse(row.id)}
        onDragStart={(e) => {
          currentDraggedIdRef.current = row.id
          handleDragStart(e, row.id)
        }}
        onDragOver={(e) => handleDragOver(e, row)}
        onDragLeave={() => {
          if (dropState?.targetId === row.id) setDropState(null)
        }}
        onDrop={(e) => handleDrop(e, row)}
        onDragEnd={handleDragEnd}
      />
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-xs text-gray-500">
        Empty document
      </div>
    )
  }

  if (!shouldVirtualize) {
    return (
      <div
        ref={scrollerRef}
        role="tree"
        aria-label="Layer tree"
        onMouseDown={handleContainerMouseDown}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {rows.map(renderRow)}
      </div>
    )
  }

  return (
    <div
      ref={scrollerRef}
      role="tree"
      aria-label="Layer tree"
      onMouseDown={handleContainerMouseDown}
      className="min-h-0 flex-1 overflow-y-auto"
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const row = rows[vi.index]
          return (
            <div
              key={row.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`,
                height: vi.size,
              }}
            >
              {renderRow(row)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Module-level ref for the in-flight dragged id. We can't read
// dataTransfer.getData during dragover (only on drop), so we stash
// the id when dragstart fires and read it back here. Module-local is
// fine because at most one drag is in flight at a time.
const currentDraggedIdRef = { current: null as string | null }

interface LayerRowProps {
  row: TreeNodeShape
  selected: boolean
  collapsed: boolean
  drop: DropState | null
  // Click is handled at the container via DOM delegation
  // (data-layer-id). The chevron button still gets its own click
  // because we stopPropagation it to keep collapse-toggle from
  // doubling as a select.
  onChevronClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function LayerRow({
  row,
  selected,
  collapsed,
  drop,
  onChevronClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: LayerRowProps) {
  const indicatorAbove = drop?.zone === 'above' && !drop.forbidden
  const indicatorBelow = drop?.zone === 'below' && !drop.forbidden
  const indicatorInside = drop?.zone === 'inside' && !drop.forbidden
  const isForbidden = drop?.forbidden === true

  return (
    <div
      draggable={row.id !== 'ROOT'}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      data-layer-id={row.id}
      className={[
        'group relative flex h-6 cursor-default items-center gap-1 pr-2 text-xs select-none',
        selected
          ? 'bg-primary/10 text-primary'
          : 'text-gray-700 hover:bg-muted',
        indicatorInside ? 'ring-1 ring-primary/60 ring-inset' : '',
      ].join(' ')}
      style={{
        paddingLeft: 4 + row.depth * 12,
        cursor: isForbidden ? 'not-allowed' : undefined,
      }}
    >
      {indicatorAbove && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-px left-0 right-0 h-0.5 bg-primary"
        />
      )}
      {indicatorBelow && (
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-px left-0 right-0 h-0.5 bg-primary"
        />
      )}
      {row.hasChildren ? (
        <button
          type="button"
          data-chevron
          onMouseDown={(e) => {
            // The container's mousedown delegate runs on the bubble
            // phase too — stopPropagation keeps a chevron click from
            // doubling as a row-select.
            e.stopPropagation()
          }}
          onClick={(e) => {
            // Defensive: stop click bubbling too, in case any
            // ancestor ever listens to click directly.
            e.stopPropagation()
            onChevronClick()
          }}
          aria-label={collapsed ? 'Expand' : 'Collapse'}
          className="flex h-4 w-4 shrink-0 items-center justify-center text-gray-400 hover:text-gray-700"
        >
          {collapsed ? (
            <ChevronRight size={12} aria-hidden />
          ) : (
            <ChevronDown size={12} aria-hidden />
          )}
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <span className="truncate">
        {row.linkedSlot && (
          <span className="mr-1 text-[10px] uppercase tracking-wide text-gray-400">
            {row.linkedSlot}:
          </span>
        )}
        {row.displayName}
      </span>
    </div>
  )
}

// Helpers — kept here rather than in buildTreeShape because they touch
// the live Craft query rather than the pure reader contract.
type CraftQuery = ReturnType<typeof useEditor>['query']

function isCanvasNode(query: CraftQuery, id: string): boolean {
  try {
    const node = query.node(id).get()
    return Boolean(node.data.isCanvas)
  } catch {
    return false
  }
}

function makeReader(query: CraftQuery): NodeReader {
  return {
    getDisplayName: (id) => {
      try {
        return (query.node(id).get().data.displayName as string) || id
      } catch {
        return id
      }
    },
    getChildren: (id) => {
      try {
        return query.node(id).get().data.nodes ?? []
      } catch {
        return []
      }
    },
    getLinkedNodes: (id) => {
      try {
        return (
          (query.node(id).get().data.linkedNodes as Record<string, string>) ??
          {}
        )
      } catch {
        return {}
      }
    },
  }
}
