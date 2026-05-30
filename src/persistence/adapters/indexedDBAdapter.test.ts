import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
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
  // The adapter references the global IDBKeyRange (a real-browser global);
  // provide fake-indexeddb's in the test env.
  vi.stubGlobal('IDBKeyRange', IDBKeyRange)
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

describe('IndexedDB StorageAdapter — version snapshots (§ 6.3)', () => {
  it('writeVersion → listVersions → readVersion round-trips', async () => {
    const idb = createIndexedDBAdapter()
    const env = makeContractEnvelope({ themeId: 'rose' })
    const res = await idb.writeVersion!('doc-1', env, {
      kind: 'manual',
      label: 'First',
    })
    expect(res).toEqual({ ok: true })

    const versions = await idb.listVersions!('doc-1')
    expect(versions).toHaveLength(1)
    expect(versions[0].label).toBe('First')
    expect(versions[0].kind).toBe('manual')

    const restored = await idb.readVersion!('doc-1', versions[0].versionId)
    expect(restored).toEqual(env)
  })

  it('scopes versions per document', async () => {
    const idb = createIndexedDBAdapter()
    await idb.writeVersion!('doc-a', makeContractEnvelope(), { kind: 'manual' })
    await idb.writeVersion!('doc-b', makeContractEnvelope(), { kind: 'manual' })
    expect(await idb.listVersions!('doc-a')).toHaveLength(1)
    expect(await idb.listVersions!('doc-b')).toHaveLength(1)
  })

  it('ring-buffers auto snapshots but keeps manual save points', async () => {
    const idb = createIndexedDBAdapter()
    // 22 autos — exceeds the cap of 20, so 2 oldest are evicted.
    for (let i = 0; i < 22; i++) {
      await idb.writeVersion!('doc-1', makeContractEnvelope(), { kind: 'auto' })
    }
    // A manual save point is exempt from eviction.
    await idb.writeVersion!('doc-1', makeContractEnvelope(), {
      kind: 'manual',
      label: 'Keep me',
    })
    const versions = await idb.listVersions!('doc-1')
    const autos = versions.filter((v) => v.kind === 'auto')
    const manuals = versions.filter((v) => v.kind === 'manual')
    expect(autos.length).toBe(20)
    expect(manuals.length).toBe(1)
  })
})
