import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.1 — TableCell. Internal canonical: hidden from the toolbox
// (only spawned by the Table via `slotComponent: 'table-cell'`). Cells
// are real Craft nodes so the standard Appearance panel can edit each
// one's border / background / etc. independently.
//
// styleSlots is just 'root' — the cell IS a single styleable surface.
// applicablePanels is intentionally narrow: width/height aren't
// meaningful for a cell (the parent Table's colWidths / rowHeights own
// that), and the cell content is a child node so Typography on the cell
// itself would shadow that. Border / bg / padding cover the actual
// per-cell editing the user is likely to want.
export const tableCellPropsSchema = z.object({})
export type TableCellProps = z.infer<typeof tableCellPropsSchema>

registerComponent<TableCellProps>({
  id: 'table-cell',
  category: 'display',
  displayName: 'Table Cell',
  tags: ['table', 'td', 'cell'],
  isCanvas: true,
  styleSlots: ['root'],
  propsSchema: tableCellPropsSchema,
  // Toolbox hides it; only the Table spawns it via slotComponent.
  hidden: true,
  // Cells get their size from the parent Table — opt out of the
  // 8-handle resize overlay so users don't accidentally try to size
  // cells directly (use the column/row drag handles instead).
  canResize: false,
  // 'tableMerge' is the custom merge-panel id registered in
  // built-in-panels.ts. Without it in the whitelist the registry's
  // applicablePanels-mode filter strips the panel even when its own
  // applicableTo predicate would have matched.
  applicablePanels: ['spacing', 'appearance', 'tableMerge'],
  defaults: {
    props: {},
    style: { classes: { root: 'border border-border' } },
  },
})
