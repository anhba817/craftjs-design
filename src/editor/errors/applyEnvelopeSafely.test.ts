import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyEnvelopeSafely } from './applyEnvelopeSafely'
import { useEditorStore } from '@/state/editorStore'
import type { EditorDocument } from '@/persistence/schema'

beforeAll(async () => {
  await import('@/registry/components')
})

beforeEach(() => {
  useEditorStore.setState({
    malformedDocument: null,
    activeAdapterId: 'shadcn',
    activeThemeId: 'default',
  })
})

const validCraftJson = JSON.stringify({
  ROOT: { type: { resolvedName: 'Box' }, parent: null, nodes: [] },
})

function mockActions(behaviour: 'ok' | 'throw' = 'ok') {
  return {
    deserialize: vi.fn(() => {
      if (behaviour === 'throw') throw new Error('craft boom')
    }),
  } as unknown as Parameters<typeof applyEnvelopeSafely>[0]
}

describe('applyEnvelopeSafely', () => {
  it('applies a healthy envelope and returns ok', () => {
    const actions = mockActions()
    const envelope: EditorDocument = {
      version: 1,
      adapterId: 'mui',
      themeId: 'rose',
      craftJson: validCraftJson,
    }
    const result = applyEnvelopeSafely(actions, 'doc-1', envelope)
    expect(result).toEqual({ ok: true })
    expect(actions.deserialize).toHaveBeenCalledWith(validCraftJson)
    expect(useEditorStore.getState().malformedDocument).toBeNull()
    // Theme + adapter were applied as a side effect.
    expect(useEditorStore.getState().activeAdapterId).toBe('mui')
    expect(useEditorStore.getState().activeThemeId).toBe('rose')
  })

  it('sets malformedDocument when craftJson fails the integrity check', () => {
    const actions = mockActions()
    const envelope: EditorDocument = {
      version: 1,
      adapterId: 'shadcn',
      craftJson: '{not-json',
    }
    const result = applyEnvelopeSafely(actions, 'doc-1', envelope)
    expect(result.ok).toBe(false)
    expect(actions.deserialize).not.toHaveBeenCalled()
    const state = useEditorStore.getState().malformedDocument
    expect(state).not.toBeNull()
    expect(state?.docId).toBe('doc-1')
    expect(state?.envelope).toEqual(envelope)
    expect(state?.error.message).toMatch(/failed to parse JSON/)
  })

  it('sets malformedDocument when Craft deserialize throws', () => {
    const actions = mockActions('throw')
    const envelope: EditorDocument = {
      version: 1,
      adapterId: 'shadcn',
      craftJson: validCraftJson,
    }
    const result = applyEnvelopeSafely(actions, 'doc-2', envelope)
    expect(result.ok).toBe(false)
    // The integrity check passes, so deserialize WAS called — and threw.
    expect(actions.deserialize).toHaveBeenCalledOnce()
    const state = useEditorStore.getState().malformedDocument
    expect(state?.docId).toBe('doc-2')
    expect(state?.error.message).toBe('craft boom')
  })

  it('clears a previously-set malformedDocument on a successful apply', () => {
    // Seed a malformed state as if a prior apply had failed.
    useEditorStore.getState().setMalformedDocument({
      docId: 'old',
      envelope: {
        version: 1,
        adapterId: 'shadcn',
        craftJson: '{not-json',
      },
      error: new Error('stale'),
    })
    const actions = mockActions()
    applyEnvelopeSafely(actions, 'new', {
      version: 1,
      adapterId: 'shadcn',
      craftJson: validCraftJson,
    })
    expect(useEditorStore.getState().malformedDocument).toBeNull()
  })
})
