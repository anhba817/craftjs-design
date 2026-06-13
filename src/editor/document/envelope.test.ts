import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '@/state/editorStore'
import { CURRENT_DOCUMENT_VERSION } from '@/persistence/schema'
import { applyEnvelope, buildEnvelope, normalizeDocument } from './envelope'

// Phase 23 § Decision 3 — the shared serialization path. These are the units
// SaveLoadBar, onChange, ControlledHydrator, and the imperative ref all share,
// so they're tested once here rather than through each caller.

const fakeQuery = (json: string) =>
  ({ serialize: () => json }) as unknown as Parameters<typeof buildEnvelope>[0]

beforeEach(() => {
  // Reset the bits buildEnvelope reads to known values.
  const store = useEditorStore.getState()
  store.setActiveAdapter('shadcn')
  store.setActiveTheme('default')
  store.setColorMode('system')
})

describe('buildEnvelope', () => {
  it('snapshots adapter / theme / colorMode / craftJson into the envelope', () => {
    const store = useEditorStore.getState()
    store.setActiveAdapter('html')
    store.setActiveTheme('emerald')
    store.setColorMode('dark')

    const env = buildEnvelope(fakeQuery('{"ROOT":{}}'))
    expect(env).toEqual({
      version: CURRENT_DOCUMENT_VERSION,
      adapterId: 'html',
      themeId: 'emerald',
      colorMode: 'dark',
      craftJson: '{"ROOT":{}}',
    })
  })
})

describe('applyEnvelope', () => {
  it('deserializes the tree then mirrors theme / colorMode / adapter into the store', () => {
    const actions = { deserialize: vi.fn() } as unknown as Parameters<
      typeof applyEnvelope
    >[0]
    applyEnvelope(actions, {
      version: CURRENT_DOCUMENT_VERSION,
      adapterId: 'html',
      themeId: 'emerald',
      colorMode: 'dark',
      craftJson: '{"ROOT":{"x":1}}',
    })
    expect(actions.deserialize).toHaveBeenCalledWith('{"ROOT":{"x":1}}')
    const store = useEditorStore.getState()
    expect(store.activeAdapterId).toBe('html')
    expect(store.activeThemeId).toBe('emerald')
    expect(store.colorMode).toBe('dark')
  })
})

describe('normalizeDocument', () => {
  const valid = {
    version: CURRENT_DOCUMENT_VERSION,
    adapterId: 'shadcn',
    craftJson: '{"ROOT":{}}',
  }

  it('parses + migrates a JSON string', () => {
    const env = normalizeDocument(JSON.stringify(valid))
    expect(env.adapterId).toBe('shadcn')
    expect(env.version).toBe(CURRENT_DOCUMENT_VERSION)
  })

  it('schema-checks + migrates an envelope object', () => {
    const env = normalizeDocument({ ...valid })
    expect(env.craftJson).toBe('{"ROOT":{}}')
  })

  it('throws on a malformed object', () => {
    expect(() =>
      normalizeDocument({ adapterId: 'shadcn' } as never),
    ).toThrow()
  })

  it('throws on a non-JSON string', () => {
    expect(() => normalizeDocument('not json')).toThrow()
  })
})
