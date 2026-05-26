import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '@/state/editorStore'

// Phase 11 § 3.11 — editorStore.editingTextNode is the single source
// of truth for "which node is currently in inline-edit mode". The
// adapter impls subscribe to it; this test pins the state-management
// contract independent of any DOM / React rendering.

describe('editorStore.editingTextNode', () => {
  beforeEach(() => {
    useEditorStore.getState().setEditingTextNode(null)
  })

  it('starts as null', () => {
    expect(useEditorStore.getState().editingTextNode).toBeNull()
  })

  it('setEditingTextNode assigns a node id', () => {
    useEditorStore.getState().setEditingTextNode('abc123')
    expect(useEditorStore.getState().editingTextNode).toBe('abc123')
  })

  it('setEditingTextNode(null) clears edit mode', () => {
    useEditorStore.getState().setEditingTextNode('abc123')
    useEditorStore.getState().setEditingTextNode(null)
    expect(useEditorStore.getState().editingTextNode).toBeNull()
  })

  it('setting a different id replaces the previous one', () => {
    useEditorStore.getState().setEditingTextNode('first')
    useEditorStore.getState().setEditingTextNode('second')
    expect(useEditorStore.getState().editingTextNode).toBe('second')
  })

  it('is independent of selection state', () => {
    // Phase 11 § 3.3 multi-selection and 3.11 inline edit are
    // separate concerns — entering edit mode shouldn't touch
    // selection, and changing selection shouldn't touch edit mode.
    useEditorStore.getState().setSelection(['x', 'y'])
    useEditorStore.getState().setEditingTextNode('z')
    expect(useEditorStore.getState().selection).toEqual(['x', 'y'])
    expect(useEditorStore.getState().editingTextNode).toBe('z')

    useEditorStore.getState().clearSelection()
    expect(useEditorStore.getState().editingTextNode).toBe('z')

    useEditorStore.getState().setEditingTextNode(null)
    expect(useEditorStore.getState().selection).toEqual([])
  })
})
