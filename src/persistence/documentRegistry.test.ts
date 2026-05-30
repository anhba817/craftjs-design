import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LEGACY_V1_KEY,
  STORAGE_KEY_INDEX,
  deleteDocumentBlob,
  getStorageUsage,
  migrateLegacyV1,
  newDocumentId,
  readDocument,
  readDocumentIndex,
  storageKeyForDocument,
  writeDocument,
  writeDocumentIndex,
} from './documentRegistry'
import { CURRENT_DOCUMENT_VERSION } from './schema'
import type { EditorDocument } from './schema'

function makeEnvelope(overrides: Partial<EditorDocument> = {}): EditorDocument {
  return {
    // CURRENT so read round-trips are exact (readDocument re-stamps older
    // envelopes via migrateDocument). The migration test overrides this.
    version: CURRENT_DOCUMENT_VERSION,
    adapterId: 'shadcn',
    themeId: 'default',
    craftJson: JSON.stringify({ ROOT: { displayName: 'Box', props: {} } }),
    ...overrides,
  }
}

// Each test gets a clean in-memory localStorage. vi.stubGlobal does what
// vi.spyOn(globalThis, 'localStorage') can't: assigns to a non-configurable
// global, restored automatically between tests.
beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => {
      data.set(k, v)
    },
    removeItem: (k: string) => {
      data.delete(k)
    },
    clear: () => {
      data.clear()
    },
    get length() {
      return data.size
    },
    key: (i: number) => Array.from(data.keys())[i] ?? null,
  })
})

describe('documentRegistry — basic CRUD', () => {
  it('readDocumentIndex returns an empty index when nothing is stored', () => {
    expect(readDocumentIndex()).toEqual({ documents: [], activeId: null })
  })

  it('writeDocumentIndex → readDocumentIndex round-trip', () => {
    const index = {
      documents: [{ id: 'a', name: 'First', created: 1, updated: 2 }],
      activeId: 'a',
    }
    writeDocumentIndex(index)
    expect(readDocumentIndex()).toEqual(index)
  })

  it('writeDocument → readDocument round-trip', () => {
    const env = makeEnvelope({ themeId: 'rose' })
    writeDocument('doc-x', env)
    expect(readDocument('doc-x')).toEqual(env)
  })

  it('readDocument returns null when the blob is missing', () => {
    expect(readDocument('nonexistent')).toBeNull()
  })

  it('readDocument runs the envelope through migrateDocument', () => {
    // Pre-Phase-6 Card shape gets stripped on read.
    const oldShapeTree = {
      'node-card': {
        displayName: 'Card',
        isCanvas: true,
        props: { nodeProps: { title: 'stale' } },
      },
    }
    writeDocument(
      'doc-old',
      // version 1 so the v2 migration step runs on read.
      makeEnvelope({ version: 1, craftJson: JSON.stringify(oldShapeTree) }),
    )
    const out = readDocument('doc-old')
    expect(out).not.toBeNull()
    const tree = JSON.parse(out!.craftJson)
    expect(tree['node-card'].props.nodeProps).toEqual({})
    expect(tree['node-card'].isCanvas).toBe(false)
  })

  it('deleteDocumentBlob removes the storage entry', () => {
    writeDocument('doc-y', makeEnvelope())
    expect(readDocument('doc-y')).not.toBeNull()
    deleteDocumentBlob('doc-y')
    expect(readDocument('doc-y')).toBeNull()
  })

  it('newDocumentId returns unique ids on repeated calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newDocumentId()))
    expect(ids.size).toBe(100)
  })

  it('storageKeyForDocument returns a stable, scoped key', () => {
    expect(storageKeyForDocument('abc')).toBe('craftjs-design:doc:abc:v2')
  })
})

describe('documentRegistry — legacy v1 migration', () => {
  it('migrates a v1 document into the v2 index when no v2 docs exist', () => {
    const legacy = makeEnvelope({ themeId: 'rose' })
    localStorage.setItem(LEGACY_V1_KEY, JSON.stringify(legacy))

    const result = migrateLegacyV1()
    expect(result).not.toBeNull()
    expect(result!.documents).toHaveLength(1)
    expect(result!.documents[0].name).toBe('Untitled')
    expect(result!.activeId).toBe(result!.documents[0].id)

    // The migrated doc is reachable by its new id.
    const migrated = readDocument(result!.documents[0].id)
    expect(migrated).toEqual(legacy)
  })

  it('removes the legacy key after successful migration (idempotent)', () => {
    const legacy = makeEnvelope()
    localStorage.setItem(LEGACY_V1_KEY, JSON.stringify(legacy))
    migrateLegacyV1()
    expect(localStorage.getItem(LEGACY_V1_KEY)).toBeNull()
    // Second call: nothing to migrate.
    expect(migrateLegacyV1()).toBeNull()
  })

  it('returns null when no legacy v1 document exists', () => {
    expect(migrateLegacyV1()).toBeNull()
  })

  it('does NOT migrate when v2 documents already exist', () => {
    // Set up v2 state first.
    writeDocumentIndex({
      documents: [{ id: 'doc-existing', name: 'Existing', created: 1, updated: 1 }],
      activeId: 'doc-existing',
    })
    // Then drop a stray v1 — should be ignored.
    localStorage.setItem(LEGACY_V1_KEY, JSON.stringify(makeEnvelope()))
    expect(migrateLegacyV1()).toBeNull()
    // Legacy key still there — migration is opt-in based on v2 emptiness.
    expect(localStorage.getItem(LEGACY_V1_KEY)).not.toBeNull()
  })

  it('returns null and leaves localStorage alone if v1 contents are corrupt', () => {
    localStorage.setItem(LEGACY_V1_KEY, '{not valid json')
    expect(migrateLegacyV1()).toBeNull()
    // Index is still empty — no partial state written.
    expect(localStorage.getItem(STORAGE_KEY_INDEX)).toBeNull()
  })
})

// Phase 9 § 1.7 — quota-aware writes return typed results so callers
// can show the right UI on QuotaExceededError instead of silently
// console.error'ing.

describe('documentRegistry — quota safety', () => {
  // Override the previous beforeEach's localStorage stub with one that
  // can be made to throw on setItem. The previous beforeEach still ran
  // (resetting per test) — we just replace the stub here for these
  // specific tests.
  let storage: Map<string, string>
  let forceErrorName: string | null

  beforeEach(() => {
    storage = new Map()
    forceErrorName = null
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
      setItem: (k: string, v: string) => {
        if (forceErrorName) {
          const err = new Error('Quota exceeded')
          err.name = forceErrorName
          throw err
        }
        storage.set(k, v)
      },
      removeItem: (k: string) => storage.delete(k),
      clear: () => storage.clear(),
      get length() {
        return storage.size
      },
      key: (i: number) => Array.from(storage.keys())[i] ?? null,
    })
  })

  it('writeDocument returns ok:true on a successful write', () => {
    const env = makeEnvelope()
    const result = writeDocument('doc-q1', env)
    expect(result).toEqual({ ok: true })
  })

  it('writeDocument returns kind:quota when setItem throws QuotaExceededError', () => {
    forceErrorName = 'QuotaExceededError'
    const result = writeDocument('doc-q1', makeEnvelope())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('quota')
  })

  it('writeDocument returns kind:quota for the Firefox NS_ERROR_DOM_QUOTA_REACHED name', () => {
    forceErrorName = 'NS_ERROR_DOM_QUOTA_REACHED'
    const result = writeDocument('doc-q2', makeEnvelope())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('quota')
  })

  it('writeDocument returns kind:unknown for non-quota setItem failures', () => {
    forceErrorName = 'SomethingElseError'
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = writeDocument('doc-q3', makeEnvelope())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('unknown')
  })

  it('writeDocument returns kind:schema and skips setItem when the envelope is invalid', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = writeDocument(
      'doc-q4',
      {} as unknown as EditorDocument,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('schema')
    expect(storage.size).toBe(0)
  })

  it('writeDocumentIndex returns kind:quota when setItem throws', () => {
    forceErrorName = 'QuotaExceededError'
    const result = writeDocumentIndex({ documents: [], activeId: null })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('quota')
  })

  it('getStorageUsage reports 0% for an empty store', () => {
    const usage = getStorageUsage()
    expect(usage.usedBytes).toBe(0)
    expect(usage.percent).toBe(0)
    expect(usage.totalBytes).toBe(5 * 1024 * 1024)
  })

  it('getStorageUsage ignores non-craftjs-design keys', () => {
    storage.set('some-other-app:big-key', 'x'.repeat(100_000))
    storage.set('craftjs-design:doc:doc-u1:v2', 'short')
    const usage = getStorageUsage()
    expect(usage.usedBytes).toBeLessThan(200)
    expect(usage.usedBytes).toBeGreaterThan(0)
  })

  it('getStorageUsage reports ≥80% once craftjs keys cross the threshold', () => {
    storage.set(
      'craftjs-design:doc:big:v2',
      'x'.repeat(4 * 1024 * 1024 + 100_000),
    )
    const usage = getStorageUsage()
    expect(usage.percent).toBeGreaterThanOrEqual(80)
  })
})
