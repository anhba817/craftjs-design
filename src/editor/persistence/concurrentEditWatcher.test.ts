import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decideStorageEvent } from './concurrentEditWatcher'
import {
  STORAGE_KEY_INDEX,
  storageKeyForDocument,
} from '@/persistence/documentRegistry'
import type { EditorDocument } from '@/persistence/schema'

const validCraftJson = JSON.stringify({
  ROOT: { type: { resolvedName: 'Box' }, parent: null, nodes: [] },
})

function envelope(): EditorDocument {
  return {
    version: 1,
    adapterId: 'shadcn',
    craftJson: validCraftJson,
  }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('decideStorageEvent', () => {
  it('returns ignore when the storage event has no key', () => {
    const result = decideStorageEvent({ key: null, newValue: '' }, 'doc-1')
    expect(result.action).toBe('ignore')
  })

  it('returns reload-index when the doc-index key changed', () => {
    const result = decideStorageEvent(
      { key: STORAGE_KEY_INDEX, newValue: JSON.stringify({}) },
      'doc-1',
    )
    expect(result.action).toBe('reload-index')
  })

  it('returns ignore when no active doc is set', () => {
    const result = decideStorageEvent(
      {
        key: storageKeyForDocument('doc-1'),
        newValue: JSON.stringify(envelope()),
      },
      null,
    )
    expect(result.action).toBe('ignore')
  })

  it('returns ignore when the changed key belongs to a different doc', () => {
    const result = decideStorageEvent(
      {
        key: storageKeyForDocument('doc-other'),
        newValue: JSON.stringify(envelope()),
      },
      'doc-active',
    )
    expect(result.action).toBe('ignore')
  })

  it('returns ignore when the doc blob was deleted (newValue=null)', () => {
    const result = decideStorageEvent(
      { key: storageKeyForDocument('doc-1'), newValue: null },
      'doc-1',
    )
    expect(result.action).toBe('ignore')
  })

  it('returns ignore when the cross-tab payload is unparseable JSON', () => {
    const result = decideStorageEvent(
      { key: storageKeyForDocument('doc-1'), newValue: '{not-json' },
      'doc-1',
    )
    expect(result.action).toBe('ignore')
  })

  it('returns ignore when the cross-tab payload fails schema validation', () => {
    const result = decideStorageEvent(
      {
        key: storageKeyForDocument('doc-1'),
        // version=2 isn't a valid value per documentSchema.
        newValue: JSON.stringify({
          version: 2,
          adapterId: 'shadcn',
          craftJson: '{}',
        }),
      },
      'doc-1',
    )
    expect(result.action).toBe('ignore')
  })

  it("returns conflict with the parsed envelope when the active doc's blob changed", () => {
    const env = envelope()
    const result = decideStorageEvent(
      {
        key: storageKeyForDocument('doc-1'),
        newValue: JSON.stringify(env),
      },
      'doc-1',
    )
    expect(result.action).toBe('conflict')
    if (result.action === 'conflict') {
      expect(result.docId).toBe('doc-1')
      expect(result.remoteEnvelope).toEqual(env)
    }
  })

  it('returns conflict for the unrelated suffix-matching key only when ids match', () => {
    // Sanity check that we match the whole-id key, not a substring.
    const env = envelope()
    const result = decideStorageEvent(
      {
        // 'doc-1' is a prefix of 'doc-12', but storageKeyForDocument
        // wraps in a stable `:v2` suffix so the prefix collision can't
        // accidentally match.
        key: storageKeyForDocument('doc-12'),
        newValue: JSON.stringify(env),
      },
      'doc-1',
    )
    expect(result.action).toBe('ignore')
  })
})
