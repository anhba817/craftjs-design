import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  makeContractEnvelope,
  runStorageAdapterContract,
} from './adapterContract'
import { createIndexedDBAdapter } from './indexedDBAdapter'
import { createLocalStorageAdapter } from './localStorageAdapter'

// Phase 14 § 6.1 — IndexedDB adapter satisfies the same shared contract as
// localStorage (via fake-indexeddb), plus the one-time localStorage → IDB
// import its init() performs on first boot.

beforeEach(() => {
  // Fresh in-memory IndexedDB per test so cached DB handles + stored data
  // don't leak between cases. Each test also builds a fresh adapter, whose
  // dbPromise re-opens against this factory.
  vi.stubGlobal('indexedDB', new IDBFactory())
})

describe('IndexedDB StorageAdapter — contract', () => {
  runStorageAdapterContract(() => createIndexedDBAdapter())
})

describe('IndexedDB StorageAdapter — localStorage import on first boot', () => {
  beforeEach(() => {
    // A populated localStorage backing store alongside the empty IDB.
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

  it('imports existing localStorage documents into IDB when IDB is empty', async () => {
    // Seed localStorage via its own adapter so the index + blob shapes match.
    const ls = createLocalStorageAdapter()
    const env = makeContractEnvelope({ themeId: 'rose' })
    await ls.writeDocument('doc-1', env)
    await ls.writeIndex({
      documents: [{ id: 'doc-1', name: 'Imported', created: 1, updated: 2 }],
      activeId: 'doc-1',
    })

    const idb = createIndexedDBAdapter()
    await idb.init?.()

    const index = await idb.readIndex()
    expect(index.activeId).toBe('doc-1')
    expect(index.documents).toHaveLength(1)
    expect(index.documents[0].name).toBe('Imported')
    expect(await idb.readDocument('doc-1')).toEqual(env)
  })

  it('does NOT import when IDB already has documents', async () => {
    // IDB pre-populated.
    const idb = createIndexedDBAdapter()
    await idb.writeDocument('idb-doc', makeContractEnvelope())
    await idb.writeIndex({
      documents: [{ id: 'idb-doc', name: 'Native', created: 1, updated: 1 }],
      activeId: 'idb-doc',
    })
    // localStorage has a different doc that must NOT be pulled in.
    const ls = createLocalStorageAdapter()
    await ls.writeDocument('ls-doc', makeContractEnvelope())
    await ls.writeIndex({
      documents: [{ id: 'ls-doc', name: 'Stale', created: 1, updated: 1 }],
      activeId: 'ls-doc',
    })

    await idb.init?.()

    const index = await idb.readIndex()
    expect(index.documents).toHaveLength(1)
    expect(index.documents[0].id).toBe('idb-doc')
  })
})
