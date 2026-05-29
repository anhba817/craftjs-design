import { describe, expect, it } from 'vitest'
import '@/registry/components' // side-effect: registers all canonicals
import { getComponent } from '../registry'
import { CODE_LANGUAGES } from './code'
import { SKELETON_VARIANTS } from './skeleton'
import {
  cellsToRect,
  containingMerge,
  isCellCovered,
  tableCellSlotKey,
  tableCellSlotKeys,
} from './table'

// Phase 13 § 5.1 — registration smoke tests for the data-display group.

describe('Group B data-display canonicals are registered', () => {
  const cases: Array<{
    id: string
    isCanvas: boolean
    defaults: object
  }> = [
    {
      id: 'table',
      isCanvas: false,
      defaults: {
        rows: 3,
        cols: 3,
        colWidths: [],
        rowHeights: [],
        merges: [],
      },
    },
    { id: 'data-list', isCanvas: true, defaults: {} },
    {
      id: 'data-list-item',
      isCanvas: false,
      defaults: { term: 'Term', description: 'Description' },
    },
    {
      id: 'code',
      isCanvas: false,
      defaults: { language: 'ts', content: "const greet = () => 'hello'" },
    },
    {
      id: 'skeleton',
      isCanvas: false,
      defaults: { variant: 'rectangle', width: '100%', height: '8rem' },
    },
  ]

  for (const c of cases) {
    it(`${c.id} is registered with the expected shape`, () => {
      const def = getComponent(c.id)
      expect(def).toBeDefined()
      expect(def?.category).toBe('display')
      expect(def?.isCanvas).toBe(c.isCanvas)
      expect(def?.styleSlots).toEqual(['root'])
      expect(def?.defaults.props).toEqual(c.defaults)
      expect(() => def?.propsSchema.parse(def?.defaults.props)).not.toThrow()
    })
  }

  it('table-cell is registered as hidden + canResize false', () => {
    const cell = getComponent('table-cell')
    expect(cell).toBeDefined()
    expect(cell?.hidden).toBe(true)
    expect(cell?.canResize).toBe(false)
    expect(cell?.isCanvas).toBe(true)
  })

  it('table-row is NOT registered (removed in the Table redesign)', () => {
    expect(getComponent('table-row')).toBeUndefined()
  })

  it('table declares slotComponent: table-cell', () => {
    const table = getComponent('table')
    expect(table?.slotComponent).toBe('table-cell')
  })
})

describe('Table dynamic cell-slot keys', () => {
  it('formats one key per (row, col)', () => {
    expect(tableCellSlotKey(0, 0)).toBe('cell-r0-c0')
    expect(tableCellSlotKey(2, 4)).toBe('cell-r2-c4')
  })
  it('row-major order for the full grid', () => {
    expect(tableCellSlotKeys(2, 3)).toEqual([
      'cell-r0-c0',
      'cell-r0-c1',
      'cell-r0-c2',
      'cell-r1-c0',
      'cell-r1-c1',
      'cell-r1-c2',
    ])
  })
  it('returns rows * cols total keys', () => {
    expect(tableCellSlotKeys(4, 5)).toHaveLength(20)
  })
})

describe('Table merge helpers', () => {
  const m = { row: 0, col: 0, rowSpan: 2, colSpan: 2 }

  it('containingMerge returns null when no merge contains the cell', () => {
    expect(containingMerge(0, 0, [], 3, 3)).toBeNull()
    expect(containingMerge(2, 2, [m], 3, 3)).toBeNull()
  })
  it('containingMerge finds the merge at + inside the rect', () => {
    expect(containingMerge(0, 0, [m], 3, 3)).toEqual(m)
    expect(containingMerge(1, 1, [m], 3, 3)).toEqual(m)
  })
  it('containingMerge ignores merges that fall outside the current grid', () => {
    // 2×2 merge starting at (4,4) on a 3×3 table — out of bounds, ignored.
    const outOfBounds = { row: 4, col: 4, rowSpan: 2, colSpan: 2 }
    expect(containingMerge(4, 4, [outOfBounds], 3, 3)).toBeNull()
  })

  it('isCellCovered is false for the merge top-left, true for inner cells', () => {
    expect(isCellCovered(0, 0, [m], 3, 3)).toBe(false)
    expect(isCellCovered(0, 1, [m], 3, 3)).toBe(true)
    expect(isCellCovered(1, 0, [m], 3, 3)).toBe(true)
    expect(isCellCovered(1, 1, [m], 3, 3)).toBe(true)
    expect(isCellCovered(2, 2, [m], 3, 3)).toBe(false)
  })

  it('tableCellSlotKeys with a merge skips covered cells', () => {
    const keys = tableCellSlotKeys(2, 2, [m])
    // 2×2 grid with a 2×2 merge covering everything → only one slot, the
    // merge's top-left.
    expect(keys).toEqual(['cell-r0-c0'])
  })

  it('cellsToRect builds a merge from a contiguous rectangle', () => {
    expect(
      cellsToRect([
        { r: 0, c: 0 },
        { r: 0, c: 1 },
        { r: 1, c: 0 },
        { r: 1, c: 1 },
      ]),
    ).toEqual({ row: 0, col: 0, rowSpan: 2, colSpan: 2 })
  })
  it('cellsToRect returns null when cells are not contiguous', () => {
    expect(
      cellsToRect([
        { r: 0, c: 0 },
        { r: 0, c: 2 }, // gap
      ]),
    ).toBeNull()
  })
  it('cellsToRect returns null for empty input', () => {
    expect(cellsToRect([])).toBeNull()
  })
})

describe('Code language enum', () => {
  it('includes the curated set + plain', () => {
    expect(CODE_LANGUAGES).toContain('plain')
    expect(CODE_LANGUAGES).toContain('ts')
    expect(CODE_LANGUAGES).toContain('json')
  })
})

describe('Skeleton variants', () => {
  it('covers text / rectangle / circle', () => {
    expect(new Set(SKELETON_VARIANTS)).toEqual(
      new Set(['text', 'rectangle', 'circle']),
    )
  })
})
