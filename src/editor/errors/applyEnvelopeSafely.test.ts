import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _resetQueueForTests,
  applyEnvelopeSafely,
} from './applyEnvelopeSafely'
import { useEditorStore } from '@/state/editorStore'
import type { EditorDocument } from '@/persistence/schema'

beforeAll(async () => {
  await import('@/registry/components')
})

beforeEach(() => {
  _resetQueueForTests()
  useEditorStore.setState({
    malformedDocument: null,
    activeAdapterId: 'shadcn',
    activeThemeId: 'default',
    allowAdapterSwitch: true,
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

function makeEnvelope(
  craftJson: string,
  partial: Partial<EditorDocument> = {},
): EditorDocument {
  return {
    version: 1,
    adapterId: partial.adapterId ?? 'shadcn',
    themeId: partial.themeId,
    craftJson,
  }
}

describe('applyEnvelopeSafely', () => {
  it('applies a healthy envelope and returns ok', async () => {
    const actions = mockActions()
    const envelope = makeEnvelope(validCraftJson, {
      adapterId: 'mui',
      themeId: 'rose',
    })
    const result = await applyEnvelopeSafely(actions, 'doc-1', envelope)
    expect(result).toEqual({ ok: true })
    expect(actions.deserialize).toHaveBeenCalledWith(validCraftJson)
    expect(useEditorStore.getState().malformedDocument).toBeNull()
    expect(useEditorStore.getState().activeAdapterId).toBe('mui')
    expect(useEditorStore.getState().activeThemeId).toBe('rose')
  })

  it('does NOT override a host-pinned adapter (allowAdapterSwitch=false)', async () => {
    // Phase 18 follow-up — <Editor adapter=… allowUserToSwitchAdapter={false}>
    // pins the adapter: the envelope's adapterId becomes a preference, not a
    // command. Theme/colorMode still apply.
    useEditorStore.setState({ allowAdapterSwitch: false })
    const actions = mockActions()
    const envelope = makeEnvelope(validCraftJson, {
      adapterId: 'mui',
      themeId: 'rose',
    })
    const result = await applyEnvelopeSafely(actions, 'doc-pinned', envelope)
    expect(result).toEqual({ ok: true })
    expect(useEditorStore.getState().activeAdapterId).toBe('shadcn')
    expect(useEditorStore.getState().activeThemeId).toBe('rose')
  })

  it('sets malformedDocument when craftJson fails the integrity check', async () => {
    const actions = mockActions()
    const envelope = makeEnvelope('{not-json')
    const result = await applyEnvelopeSafely(actions, 'doc-1', envelope)
    expect(result.ok).toBe(false)
    expect(actions.deserialize).not.toHaveBeenCalled()
    const state = useEditorStore.getState().malformedDocument
    expect(state).not.toBeNull()
    expect(state?.docId).toBe('doc-1')
    expect(state?.error.message).toMatch(/failed to parse JSON/)
  })

  it('sets malformedDocument when Craft deserialize throws', async () => {
    const actions = mockActions('throw')
    const envelope = makeEnvelope(validCraftJson)
    const result = await applyEnvelopeSafely(actions, 'doc-2', envelope)
    expect(result.ok).toBe(false)
    expect(actions.deserialize).toHaveBeenCalledOnce()
    expect(useEditorStore.getState().malformedDocument?.error.message).toBe(
      'craft boom',
    )
  })

  it('clears a previously-set malformedDocument on a successful apply', async () => {
    useEditorStore.getState().setMalformedDocument({
      docId: 'old',
      envelope: makeEnvelope('{not-json'),
      error: new Error('stale'),
    })
    const actions = mockActions()
    await applyEnvelopeSafely(actions, 'new', makeEnvelope(validCraftJson))
    expect(useEditorStore.getState().malformedDocument).toBeNull()
  })
})

describe('applyEnvelopeSafely — § 1.10 hydration race safety', () => {
  it('latest apply wins when calls are enqueued in the same tick', async () => {
    const actions = mockActions()
    const a = makeEnvelope(
      JSON.stringify({ ROOT: { type: { resolvedName: 'Box' }, parent: null } }),
      { adapterId: 'shadcn' },
    )
    const b = makeEnvelope(
      JSON.stringify({
        ROOT: { type: { resolvedName: 'Box' }, parent: null, nodes: [] },
      }),
      { adapterId: 'mui' },
    )
    const c = makeEnvelope(
      JSON.stringify({
        ROOT: {
          type: { resolvedName: 'Box' },
          parent: null,
          nodes: ['child1'],
        },
        child1: {
          type: { resolvedName: 'Box' },
          parent: 'ROOT',
          nodes: [],
        },
      }),
      { adapterId: 'mui', themeId: 'rose' },
    )

    // Fire all three in the same synchronous tick.
    const p1 = applyEnvelopeSafely(actions, 'A', a)
    const p2 = applyEnvelopeSafely(actions, 'B', b)
    const p3 = applyEnvelopeSafely(actions, 'C', c)

    const results = await Promise.all([p1, p2, p3])
    // First two were superseded; only the third actually applied.
    expect(results[0]).toEqual({ ok: true, superseded: true })
    expect(results[1]).toEqual({ ok: true, superseded: true })
    expect(results[2]).toEqual({ ok: true })
    expect(actions.deserialize).toHaveBeenCalledTimes(1)
    expect(actions.deserialize).toHaveBeenCalledWith(c.craftJson)
    // Final store state reflects the latest envelope's metadata.
    expect(useEditorStore.getState().activeAdapterId).toBe('mui')
    expect(useEditorStore.getState().activeThemeId).toBe('rose')
  })

  it('sequential applies (one resolved before the next) both run', async () => {
    const actions = mockActions()
    const a = makeEnvelope(validCraftJson, { adapterId: 'shadcn' })
    const b = makeEnvelope(validCraftJson, { adapterId: 'mui' })

    await applyEnvelopeSafely(actions, 'A', a)
    await applyEnvelopeSafely(actions, 'B', b)

    // Both applied — neither superseded — because each finished before
    // the next was enqueued.
    expect(actions.deserialize).toHaveBeenCalledTimes(2)
    expect(useEditorStore.getState().activeAdapterId).toBe('mui')
  })

  it('a failing apply does not block subsequent applies', async () => {
    const actions = mockActions()
    const broken = makeEnvelope('{not-json')
    const good = makeEnvelope(validCraftJson, { adapterId: 'mui' })

    const p1 = applyEnvelopeSafely(actions, 'broken', broken)
    const p2 = applyEnvelopeSafely(actions, 'good', good)
    const [r1, r2] = await Promise.all([p1, p2])

    // First is superseded (broken queued behind, then good supersedes it
    // before its turn). Last enqueued (good) lands and clears the
    // malformed state.
    expect(r1.ok).toBe(true)
    expect(r1.superseded).toBe(true)
    expect(r2.ok).toBe(true)
    expect(useEditorStore.getState().activeAdapterId).toBe('mui')
    expect(useEditorStore.getState().malformedDocument).toBeNull()
  })

  it('a single failing apply (no successor) still sets malformedDocument', async () => {
    const actions = mockActions()
    const result = await applyEnvelopeSafely(
      actions,
      'doc-1',
      makeEnvelope('{not-json'),
    )
    expect(result.ok).toBe(false)
    expect(useEditorStore.getState().malformedDocument?.docId).toBe('doc-1')
  })
})
