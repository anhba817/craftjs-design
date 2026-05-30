import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  makeContractEnvelope,
  runStorageAdapterContract,
} from './adapterContract'
import { createLocalStorageAdapter } from './localStorageAdapter'

// Phase 14 § 6.2 — localStorage adapter satisfies the shared StorageAdapter
// contract; plus a localStorage-specific test for the legacy v1 → v2
// migration its init() runs.

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

describe('localStorage StorageAdapter — contract', () => {
  runStorageAdapterContract(() => createLocalStorageAdapter())
})

describe('localStorage StorageAdapter — legacy migration', () => {
  it('init runs the legacy v1 migration (idempotent)', async () => {
    const legacy = makeContractEnvelope({ themeId: 'rose' })
    localStorage.setItem('craftjs-design:doc:v1', JSON.stringify(legacy))
    const a = createLocalStorageAdapter()
    await a.init?.()
    const index = await a.readIndex()
    expect(index.documents).toHaveLength(1)
    expect(index.documents[0].name).toBe('Untitled')
    expect(await a.readDocument(index.documents[0].id)).toEqual(legacy)
    // Idempotent — re-running init does nothing now the legacy key is gone.
    await a.init?.()
    expect((await a.readIndex()).documents).toHaveLength(1)
  })
})
