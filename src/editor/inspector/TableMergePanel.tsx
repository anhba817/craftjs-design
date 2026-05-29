import { useEditor } from '@craftjs/core'
import { cn } from '@/lib/utils'
import {
  cellsToRect,
  containingMerge,
  type TableMerge,
  type TableProps,
} from '@/registry/components/table'
import { useEditorStore } from '@/state/editorStore'

// Phase 13 § 5.1 — Table cell merge UI. Applies when a TableCell is
// selected (registered with `applicableTo: id === 'table-cell'`). Drives
// merge/unmerge against the parent Table's `merges` prop:
//
//   • Single selected cell sitting INSIDE an existing merge → "Unmerge".
//   • 2+ cells selected (Cmd-click) that share the same parent Table AND
//     form a contiguous rectangle → "Merge cells" button writes a new
//     entry into the parent's merges.
//   • Otherwise the panel renders a hint about Cmd-click.

interface CraftWrapperProps {
  nodeProps: TableProps
}

// Parse a TableCell's (r, c) coordinates from the slot id it was created
// under. The Table's canvasSlots names slots like "cell-r0-c1" — that key
// is also the Element id, which appears in the parent's linkedNodes map
// against the Craft node id.
function parseCellRC(slotKey: string): { r: number; c: number } | null {
  const m = /^cell-r(\d+)-c(\d+)$/.exec(slotKey)
  if (!m) return null
  return { r: Number(m[1]), c: Number(m[2]) }
}

interface CellInfo {
  nodeId: string
  parentId: string
  r: number
  c: number
}

export function TableMergePanel({
  nodeId,
}: {
  nodeId: string
  nodeIds: readonly string[]
  slot: string
}) {
  const { actions, cells, mergesByTable } = useEditor((_state, query) => {
    const selection = useEditorStore.getState().selection
    const infos: CellInfo[] = []
    const mergeMap = new Map<string, TableMerge[]>()
    for (const id of selection) {
      try {
        const node = query.node(id).get()
        const displayName = node.data.displayName as string | undefined
        if (displayName !== 'Table Cell') continue
        const parentId = node.data.parent
        if (!parentId) continue
        const parent = query.node(parentId).get()
        const linked = (parent.data.linkedNodes as Record<string, string>) ?? {}
        let slotKey: string | null = null
        for (const [k, v] of Object.entries(linked)) {
          if (v === id) {
            slotKey = k
            break
          }
        }
        const rc = slotKey ? parseCellRC(slotKey) : null
        if (!rc) continue
        infos.push({ nodeId: id, parentId, ...rc })
        if (!mergeMap.has(parentId)) {
          const parentProps = (parent.data.props as { nodeProps?: TableProps })
            .nodeProps
          mergeMap.set(parentId, parentProps?.merges ?? [])
        }
      } catch {
        // Node removed mid-render — skip.
      }
    }
    return { cells: infos, mergesByTable: mergeMap }
  })

  // All-same-parent constraint: a merge action only makes sense when every
  // selected cell belongs to the SAME Table.
  const parentIds = new Set(cells.map((x) => x.parentId))
  const sameParent = parentIds.size === 1
  const parentId = sameParent ? [...parentIds][0]! : null
  const merges = parentId ? mergesByTable.get(parentId) ?? [] : []

  const writeMerges = (tableId: string, next: TableMerge[]) => {
    actions.setProp(tableId, (p: CraftWrapperProps) => {
      if (!p.nodeProps.merges) p.nodeProps.merges = []
      p.nodeProps.merges.splice(0, p.nodeProps.merges.length, ...next)
    })
  }

  // Merge — 2+ cells, same parent, forming a contiguous rectangle, with
  // no overlap against existing merges.
  const candidate = cells.length >= 2 && sameParent
    ? cellsToRect(cells.map(({ r, c }) => ({ r, c })))
    : null
  const overlapsExisting = candidate && parentId
    ? merges.some(
        (m) =>
          candidate.row < m.row + m.rowSpan &&
          candidate.row + candidate.rowSpan > m.row &&
          candidate.col < m.col + m.colSpan &&
          candidate.col + candidate.colSpan > m.col,
      )
    : false
  const canMerge = candidate && parentId && !overlapsExisting

  // Unmerge — exactly one cell selected, and it's the top-left of an
  // existing merge in its parent Table.
  let unmergeIdx: number | null = null
  if (cells.length === 1 && parentId) {
    const { r, c } = cells[0]
    unmergeIdx = merges.findIndex((m) => m.row === r && m.col === c)
    if (unmergeIdx < 0) unmergeIdx = null
  }
  // Also catch the case where a single cell is selected and it IS the
  // origin OR within an existing merge — for "within" we still offer
  // unmerge of that merge.
  if (unmergeIdx === null && cells.length === 1 && parentId) {
    const { r, c } = cells[0]
    const m = containingMerge(r, c, merges, 999, 999)
    if (m) unmergeIdx = merges.indexOf(m)
  }

  const apply = () => {
    if (!canMerge || !parentId || !candidate) return
    writeMerges(parentId, [...merges, candidate])
  }
  const unmerge = () => {
    if (unmergeIdx === null || !parentId) return
    writeMerges(parentId, merges.filter((_, i) => i !== unmergeIdx))
  }

  // Use nodeId via the merge applicability — keep TypeScript happy; the
  // selected primary is always one of `cells` (we don't read nodeId
  // directly, but the prop is part of the panel-registry contract).
  void nodeId

  return (
    <section className="space-y-2 text-xs">
      {cells.length === 0 ? (
        <p className="text-[11px] text-gray-500">
          Select cells (Cmd / Ctrl-click for multi) to merge or unmerge.
        </p>
      ) : (
        <p className="text-[11px] text-gray-500">
          {cells.length} cell{cells.length === 1 ? '' : 's'} selected
          {sameParent ? '' : ' (across multiple tables)'}
        </p>
      )}

      {candidate && !canMerge && (
        <p className="text-[11px] text-amber-600">
          Selection overlaps an existing merge.
        </p>
      )}
      {cells.length >= 2 && sameParent && !candidate && (
        <p className="text-[11px] text-amber-600">
          Selected cells must form a contiguous rectangle.
        </p>
      )}

      <div className="flex gap-2">
        {cells.length >= 2 && (
          <button
            type="button"
            onClick={apply}
            disabled={!canMerge}
            className={cn(
              'rounded px-2 py-1 text-primary-foreground',
              canMerge
                ? 'bg-primary hover:opacity-90'
                : 'cursor-not-allowed bg-primary/40',
            )}
          >
            Merge {candidate ? `${candidate.rowSpan}×${candidate.colSpan}` : ''}
          </button>
        )}
        {unmergeIdx !== null && (
          <button
            type="button"
            onClick={unmerge}
            className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50"
          >
            Unmerge
          </button>
        )}
      </div>
    </section>
  )
}
