import { z } from 'zod'
import { registerComponent } from '../registry'
// Phase 18 — the pure cell/merge helpers live in the side-effect-free
// `dynamic-slots` module so the SDK can re-export them without pulling this
// canonical's registration. Imported here for `canvasSlots` + re-exported for
// back-compat (TableMergePanel + adapter impls import them from here).
import {
  CELL_PREFIX,
  cellsToRect,
  containingMerge,
  isCellCovered,
  tableCellSlotKey,
  tableCellSlotKeys,
} from './dynamic-slots'
export {
  CELL_PREFIX,
  cellsToRect,
  containingMerge,
  isCellCovered,
  tableCellSlotKey,
  tableCellSlotKeys,
}

// Phase 13 § 5.1 — Table is a single composite canonical. The designer
// drops one Table, then sets `rows` × `cols` on it; each cell is a Craft
// canvas (Pattern B dynamic slots, same mechanism Tabs uses for its per-tab
// canvases). Row / Cell are NOT separately registered canonicals — the
// Table owns the grid model so resize and merge can be expressed against a
// single component rather than coordinating across three.

export const TABLE_MAX_ROWS = 50
export const TABLE_MAX_COLS = 20

// One merge entry — a rectangular span starting at (row, col) covering
// `rowSpan` × `colSpan` cells. The cell at (row, col) is the "owner": it
// gets the canvas slot and the rendered `<td colSpan/rowSpan>`. Other
// cells inside the span are skipped entirely (no slot, no <td>).
export const mergeSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  rowSpan: z.number().int().min(1),
  colSpan: z.number().int().min(1),
})
export type TableMerge = z.infer<typeof mergeSchema>

export const tablePropsSchema = z.object({
  rows: z.number().int().min(1).max(TABLE_MAX_ROWS),
  cols: z.number().int().min(1).max(TABLE_MAX_COLS),
  // Per-column widths (`<colgroup><col style="width:…"/></colgroup>`) and
  // per-row heights (`<tr style="height:…">`). Optional CSS length strings;
  // any empty entry leaves that column / row to the browser's table layout
  // algorithm. Length is independent of `rows` / `cols` — extra entries
  // are ignored, missing entries fall back to auto. This is the canonical
  // place to express table sizing; per-cell width/height isn't honored by
  // HTML table layout, so cell-level resize isn't a supported abstraction.
  colWidths: z.array(z.string()),
  rowHeights: z.array(z.string()),
  // Cell merges (Phase 13 § 5.1). Each entry is a rectangular span; the
  // top-left cell of the rectangle keeps its canvas slot, every other
  // cell inside is omitted from rendering and from `canvasSlots`. Merges
  // that fall outside the current rows/cols bounds are ignored at render
  // time (so shrinking the table doesn't crash existing merges, they
  // just stop applying).
  merges: z.array(mergeSchema),
})
export type TableProps = z.infer<typeof tablePropsSchema>

registerComponent<TableProps>({
  id: 'table',
  category: 'display',
  displayName: 'Table',
  tags: ['table', 'grid', 'data'],
  // Pattern B — the outer node is a wrapper; each cell is its own canvas.
  isCanvas: false,
  styleSlots: ['root'],
  canvasSlots: (props) => {
    const { rows, cols, merges } = props as TableProps
    return tableCellSlotKeys(rows, cols, merges ?? [])
  },
  // Phase 13 § 5.1 — each cell is a TableCell canonical so the standard
  // Appearance panel can edit per-cell border / background / etc. The
  // CanonicalNode picks this up when generating slot Elements.
  slotComponent: 'table-cell',
  propsSchema: tablePropsSchema,
  defaults: {
    props: { rows: 3, cols: 3, colWidths: [], rowHeights: [], merges: [] },
    style: {
      classes: { root: 'border border-border rounded-md overflow-hidden' },
    },
  },
})
