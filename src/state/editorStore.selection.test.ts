import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore'

// Phase 11 § 3.3 — sanity-check the multi-selection helpers in the
// zustand store. These run on the live store instance; reset before
// each test.

describe('editorStore selection', () => {
  beforeEach(() => {
    useEditorStore.getState().clearSelection()
  })

  it('starts empty', () => {
    expect(useEditorStore.getState().selection).toEqual([])
  })

  it('setSelection replaces with provided ids', () => {
    useEditorStore.getState().setSelection(['a', 'b'])
    expect(useEditorStore.getState().selection).toEqual(['a', 'b'])
  })

  it('setSelection dedupes while preserving order', () => {
    useEditorStore.getState().setSelection(['a', 'b', 'a', 'c', 'b'])
    expect(useEditorStore.getState().selection).toEqual(['a', 'b', 'c'])
  })

  it('toggleSelection appends a new id', () => {
    useEditorStore.getState().setSelection(['a'])
    useEditorStore.getState().toggleSelection('b')
    expect(useEditorStore.getState().selection).toEqual(['a', 'b'])
  })

  it('toggleSelection removes an existing id', () => {
    useEditorStore.getState().setSelection(['a', 'b', 'c'])
    useEditorStore.getState().toggleSelection('b')
    expect(useEditorStore.getState().selection).toEqual(['a', 'c'])
  })

  it('clearSelection empties the list', () => {
    useEditorStore.getState().setSelection(['a', 'b'])
    useEditorStore.getState().clearSelection()
    expect(useEditorStore.getState().selection).toEqual([])
  })

  it('toggling the only id leaves selection empty', () => {
    useEditorStore.getState().setSelection(['a'])
    useEditorStore.getState().toggleSelection('a')
    expect(useEditorStore.getState().selection).toEqual([])
  })
})
