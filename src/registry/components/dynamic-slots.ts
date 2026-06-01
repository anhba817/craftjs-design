// Phase 17 § 8.4 / Phase 18 — pure (side-effect-free) slot + canvas-geometry
// helpers for the dynamic-canvas canonicals (Tabs, Carousel, Stepper, Table).
//
// These live HERE, not in `tabs.ts` / `carousel.ts` / `stepper.ts` /
// `table.ts`, on purpose: those modules call `registerComponent(...)` at
// module load, so importing them registers a canonical. The public SDK
// (`sdk/canonical.ts`) re-exports these helpers for third-party adapter
// authors building a custom impl — and the SDK must stay tree-shakable, so
// importing it can't drag in canonical registration. The canonical modules
// re-export from here for back-compat (existing
// `@/registry/components/{tabs,carousel,stepper,table}` imports keep working);
// importing THIS module registers nothing.
//
// `TableMerge` is imported type-only (erased at runtime), so this module
// carries no runtime dependency on — and pulls no registration from —
// `table.ts`.
import type { TableMerge } from './table'

export const TAB_SLOT_PREFIX = 'tab-'
export const SLIDE_SLOT_PREFIX = 'slide-'
export const STEP_SLOT_PREFIX = 'step-'
export const CELL_PREFIX = 'cell-'

/**
 * Synthesises a unique render value per tab. Phase 10's stable-id work
 * (§ 2.11) makes this largely obsolete for slot-key derivation —
 * `tabSlotKeys` handles that now. The helper survives as the source
 * of truth for the Radix/MUI `value` prop (which still keys on the
 * user-authored `value` field), and as the migration path's tool for
 * picking ids that preserve existing slot keys.
 *
 * Returns one synthetic value per input tab, in index order:
 *   - Unique non-empty `value` → passes through unchanged.
 *   - Empty `value` → `_unset_<index>`.
 *   - Duplicate `value` → first occurrence keeps the value; second gets
 *     `<value>__1`, third `<value>__2`, etc.
 */
export function uniqueTabValues(tabs: readonly { value: string }[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < tabs.length; i++) {
    const base = tabs[i].value || `_unset_${i}`
    let v = base
    let suffix = 1
    while (seen.has(v)) {
      v = `${base}__${suffix}`
      suffix++
    }
    seen.add(v)
    out.push(v)
  }
  return out
}

/**
 * Resolves the slot key for each tab. Uses `tab.id` as the source of truth
 * (stable across `value` renames), falling back to `uniqueTabValues(tabs)[i]`
 * for id-less tabs. Returned in input order; same length as `tabs`.
 */
export function tabSlotKeys(
  tabs: readonly { id?: string; value: string }[],
): string[] {
  const fallback = uniqueTabValues(tabs)
  return tabs.map((t, i) => `${TAB_SLOT_PREFIX}${t.id ?? fallback[i]}`)
}

/**
 * Resolves the slot key for each slide. Same shape as `tabSlotKeys`.
 * Double-prefixed (`slide-slide-${id}`) is intentional — `id` already starts
 * with `slide-` from genSlideId, and ALL slot keys share the SLIDE_SLOT_PREFIX
 * so the registry / serializer can recognise them.
 */
export function slideSlotKeys(slides: readonly { id: string }[]): string[] {
  return slides.map((s) => `${SLIDE_SLOT_PREFIX}${s.id}`)
}

// --- Stepper -------------------------------------------------------------

/** Slot key for step `i` (0-indexed). */
export function stepperSlotKey(i: number): string {
  return `${STEP_SLOT_PREFIX}${i}`
}
/** All step slot keys for a stepper with `count` steps, in order. */
export function stepperSlotKeys(count: number): readonly string[] {
  const out: string[] = []
  for (let i = 0; i < count; i++) out.push(stepperSlotKey(i))
  return out
}

// --- Table ---------------------------------------------------------------

/** Slot key for the (row, col) cell. 0-indexed. */
export function tableCellSlotKey(row: number, col: number): string {
  return `${CELL_PREFIX}r${row}-c${col}`
}

/**
 * The merge that contains (r, c), ignoring out-of-bounds merges. Used by both
 * the canvasSlots generator and the adapter render so slot ids and DOM cells
 * can't disagree.
 */
export function containingMerge(
  r: number,
  c: number,
  merges: readonly TableMerge[],
  rows: number,
  cols: number,
): TableMerge | null {
  for (const m of merges) {
    // Skip merges that fall outside the current grid (e.g. after the user
    // shrinks rows/cols). They're stored but not applied.
    if (m.row + m.rowSpan > rows) continue
    if (m.col + m.colSpan > cols) continue
    if (r >= m.row && r < m.row + m.rowSpan && c >= m.col && c < m.col + m.colSpan) {
      return m
    }
  }
  return null
}

/** True when (r, c) sits inside a merge but isn't the merge's top-left. */
export function isCellCovered(
  r: number,
  c: number,
  merges: readonly TableMerge[],
  rows: number,
  cols: number,
): boolean {
  const m = containingMerge(r, c, merges, rows, cols)
  return m !== null && (m.row !== r || m.col !== c)
}

/**
 * Slot list in row-major order, omitting cells covered by a merge (those have
 * no slot — the merge's top-left owns the content).
 */
export function tableCellSlotKeys(
  rows: number,
  cols: number,
  merges: readonly TableMerge[] = [],
): string[] {
  const out: string[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isCellCovered(r, c, merges, rows, cols)) continue
      out.push(tableCellSlotKey(r, c))
    }
  }
  return out
}

/**
 * Take a list of (r, c) cells and return the rectangular merge that covers
 * them iff they form a complete contiguous rectangle. null otherwise — the
 * merge UI uses this to gate the "Apply" button.
 */
export function cellsToRect(
  cells: readonly { r: number; c: number }[],
): TableMerge | null {
  if (cells.length === 0) return null
  let minR = Infinity
  let maxR = -Infinity
  let minC = Infinity
  let maxC = -Infinity
  for (const { r, c } of cells) {
    if (r < minR) minR = r
    if (r > maxR) maxR = r
    if (c < minC) minC = c
    if (c > maxC) maxC = c
  }
  const rowSpan = maxR - minR + 1
  const colSpan = maxC - minC + 1
  if (cells.length !== rowSpan * colSpan) return null
  const present = new Set(cells.map(({ r, c }) => `${r},${c}`))
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (!present.has(`${r},${c}`)) return null
    }
  }
  return { row: minR, col: minC, rowSpan, colSpan }
}
