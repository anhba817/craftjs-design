import { describe, expect, it } from 'vitest'
import { decideBroadcast } from './concurrentEditWatcher'

// Phase 14 § 6.2 — the watcher now reacts to BroadcastChannel messages
// instead of localStorage `storage` events. `decideBroadcast` is the pure
// message→action mapper; the remote-envelope read it triggers for a
// conflict is async (adapter) and lives in the effect, not here.

describe('decideBroadcast', () => {
  it('returns reload-index for an index-changed message', () => {
    const result = decideBroadcast({ type: 'index-changed' }, 'doc-1')
    expect(result.action).toBe('reload-index')
  })

  it('reload-index fires regardless of the active id', () => {
    expect(decideBroadcast({ type: 'index-changed' }, null).action).toBe(
      'reload-index',
    )
  })

  it('returns ignore for a doc-changed message when no active doc is set', () => {
    const result = decideBroadcast({ type: 'doc-changed', docId: 'doc-1' }, null)
    expect(result.action).toBe('ignore')
  })

  it('returns ignore when the changed doc is not the active doc', () => {
    const result = decideBroadcast(
      { type: 'doc-changed', docId: 'doc-other' },
      'doc-active',
    )
    expect(result.action).toBe('ignore')
  })

  it("returns check-conflict for the active doc's change", () => {
    const result = decideBroadcast(
      { type: 'doc-changed', docId: 'doc-1' },
      'doc-1',
    )
    expect(result.action).toBe('check-conflict')
    if (result.action === 'check-conflict') {
      expect(result.docId).toBe('doc-1')
    }
  })

  it('matches the whole doc id, not a prefix', () => {
    // 'doc-1' is a prefix of 'doc-12'; the equality check must not match.
    const result = decideBroadcast(
      { type: 'doc-changed', docId: 'doc-12' },
      'doc-1',
    )
    expect(result.action).toBe('ignore')
  })
})
