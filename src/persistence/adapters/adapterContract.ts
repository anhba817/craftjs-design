import { expect, it } from 'vitest'
import { CURRENT_DOCUMENT_VERSION } from '../schema'
import type { EditorDocument } from '../schema'
import type { StorageAdapter } from '../types'

// Phase 14 § 6.2 — shared StorageAdapter contract.
//
// One behavioral spec that EVERY adapter must satisfy, run against both
// the localStorage and IndexedDB implementations so they can't drift. The
// caller opens a `describe` block, sets up a fresh backing store in
// `beforeEach`, then invokes `runStorageAdapterContract(makeAdapter)` —
// each `it` builds a fresh adapter via the factory so the cached DB handle
// is isolated per test.

export function makeContractEnvelope(
  overrides: Partial<EditorDocument> = {},
): EditorDocument {
  return {
    // Default to the CURRENT version so round-trip assertions are exact
    // (readDocument re-stamps anything older via migrateDocument). Tests
    // exercising migration pass an explicit older `version`.
    version: CURRENT_DOCUMENT_VERSION,
    adapterId: 'shadcn',
    themeId: 'default',
    craftJson: JSON.stringify({ ROOT: { displayName: 'Box', props: {} } }),
    ...overrides,
  }
}

export function runStorageAdapterContract(
  makeAdapter: () => StorageAdapter,
): void {
  it('readIndex returns an empty index initially', async () => {
    const a = makeAdapter()
    expect(await a.readIndex()).toEqual({ documents: [], activeId: null })
  })

  it('writeIndex → readIndex round-trips', async () => {
    const a = makeAdapter()
    const index = {
      documents: [{ id: 'a', name: 'First', created: 1, updated: 2 }],
      activeId: 'a',
    }
    const res = await a.writeIndex(index)
    expect(res).toEqual({ ok: true })
    expect(await a.readIndex()).toEqual(index)
  })

  it('writeDocument → readDocument round-trips', async () => {
    const a = makeAdapter()
    const env = makeContractEnvelope({ themeId: 'rose' })
    const res = await a.writeDocument('doc-x', env)
    expect(res).toEqual({ ok: true })
    expect(await a.readDocument('doc-x')).toEqual(env)
  })

  it('readDocument returns null for a missing blob', async () => {
    const a = makeAdapter()
    expect(await a.readDocument('nope')).toBeNull()
  })

  it('readDocument runs the envelope through migrateDocument', async () => {
    const a = makeAdapter()
    // Pre-Phase-6 Card shape is stripped on read.
    const oldShapeTree = {
      'node-card': {
        displayName: 'Card',
        isCanvas: true,
        props: { nodeProps: { title: 'stale' } },
      },
    }
    await a.writeDocument(
      'doc-old',
      // Stamp version 1 so the v2 migration step actually runs on read.
      makeContractEnvelope({
        version: 1,
        craftJson: JSON.stringify(oldShapeTree),
      }),
    )
    const out = await a.readDocument('doc-old')
    expect(out).not.toBeNull()
    const tree = JSON.parse(out!.craftJson)
    expect(tree['node-card'].props.nodeProps).toEqual({})
    expect(tree['node-card'].isCanvas).toBe(false)
  })

  it('deleteDocument removes the blob', async () => {
    const a = makeAdapter()
    await a.writeDocument('doc-y', makeContractEnvelope())
    expect(await a.readDocument('doc-y')).not.toBeNull()
    await a.deleteDocument('doc-y')
    expect(await a.readDocument('doc-y')).toBeNull()
  })

  it('estimateUsage reports a usage shape', async () => {
    const a = makeAdapter()
    const usage = await a.estimateUsage()
    expect(typeof usage.usedBytes).toBe('number')
    expect(typeof usage.totalBytes).toBe('number')
    expect(typeof usage.percent).toBe('number')
    expect(usage.percent).toBeGreaterThanOrEqual(0)
  })
}
