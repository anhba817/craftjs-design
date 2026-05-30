import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EditorDocument } from '../schema'
import { createLocalStorageAdapter } from './localStorageAdapter'

// Phase 14 § 6.2 — StorageAdapter contract, exercised against the
// localStorage implementation. Group B runs the same shape of assertions
// against the IndexedDB adapter (via fake-indexeddb) so both satisfy
// identical behavior.

function makeEnvelope(overrides: Partial<EditorDocument> = {}): EditorDocument {
  return {
    version: 1,
    adapterId: 'shadcn',
    themeId: 'default',
    craftJson: JSON.stringify({ ROOT: { displayName: 'Box', props: {} } }),
    ...overrides,
  }
}

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    get length() {
      return data.size
    },
    key: (i: number) => Array.from(data.keys())[i] ?? null,
  })
})

describe('localStorage StorageAdapter', () => {
  it('readIndex returns an empty index initially', async () => {
    const a = createLocalStorageAdapter()
    expect(await a.readIndex()).toEqual({ documents: [], activeId: null })
  })

  it('writeIndex → readIndex round-trips', async () => {
    const a = createLocalStorageAdapter()
    const index = {
      documents: [{ id: 'a', name: 'First', created: 1, updated: 2 }],
      activeId: 'a',
    }
    const res = await a.writeIndex(index)
    expect(res).toEqual({ ok: true })
    expect(await a.readIndex()).toEqual(index)
  })

  it('writeDocument → readDocument round-trips', async () => {
    const a = createLocalStorageAdapter()
    const env = makeEnvelope({ themeId: 'rose' })
    await a.writeDocument('doc-x', env)
    expect(await a.readDocument('doc-x')).toEqual(env)
  })

  it('readDocument returns null for a missing blob', async () => {
    const a = createLocalStorageAdapter()
    expect(await a.readDocument('nope')).toBeNull()
  })

  it('deleteDocument removes the blob', async () => {
    const a = createLocalStorageAdapter()
    await a.writeDocument('doc-y', makeEnvelope())
    await a.deleteDocument('doc-y')
    expect(await a.readDocument('doc-y')).toBeNull()
  })

  it('estimateUsage reports a percent and a positive total', async () => {
    const a = createLocalStorageAdapter()
    await a.writeDocument('doc-u', makeEnvelope())
    const usage = await a.estimateUsage()
    expect(usage.totalBytes).toBeGreaterThan(0)
    expect(usage.usedBytes).toBeGreaterThan(0)
    expect(usage.percent).toBeGreaterThan(0)
  })

  it('init runs the legacy v1 migration (idempotent)', async () => {
    const legacy = makeEnvelope({ themeId: 'rose' })
    localStorage.setItem('craftjs-design:doc:v1', JSON.stringify(legacy))
    const a = createLocalStorageAdapter()
    await a.init?.()
    const index = await a.readIndex()
    expect(index.documents).toHaveLength(1)
    expect(index.documents[0].name).toBe('Untitled')
    // Migrated blob reachable by its new id.
    expect(await a.readDocument(index.documents[0].id)).toEqual(legacy)
    // Idempotent — re-running init does nothing now the legacy key is gone.
    await a.init?.()
    expect((await a.readIndex()).documents).toHaveLength(1)
  })
})
