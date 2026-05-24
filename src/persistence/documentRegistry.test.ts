import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LEGACY_V1_KEY,
  STORAGE_KEY_INDEX,
  deleteDocumentBlob,
  migrateLegacyV1,
  newDocumentId,
  readDocument,
  readDocumentIndex,
  storageKeyForDocument,
  writeDocument,
  writeDocumentIndex,
} from './documentRegistry'
import type { EditorDocument } from './schema'

function makeEnvelope(overrides: Partial<EditorDocument> = {}): EditorDocument {
  return {
    version: 1,
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
      makeEnvelope({ craftJson: JSON.stringify(oldShapeTree) }),
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
