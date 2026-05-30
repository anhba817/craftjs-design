import { describe, expect, it } from 'vitest'
import { migrateDocument } from './migrations'
import { CURRENT_DOCUMENT_VERSION } from './schema'

describe('migrateDocument — Phase 6 Card props strip', () => {
  it('removes stale Card props (title, description, showFooter, footerText)', () => {
    const tree = {
      ROOT: { type: { resolvedName: 'Box' }, displayName: 'Box', props: {} },
      'node-card': {
        type: { resolvedName: 'Card' },
        displayName: 'Card',
        props: {
          nodeProps: {
            title: 'Old title',
            description: 'Old description',
            showFooter: true,
            footerText: 'Old footer',
          },
        },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }

    const migrated = migrateDocument(doc)
    const out = JSON.parse(migrated.craftJson)
    expect(out['node-card'].props.nodeProps).toEqual({})
  })

  it('leaves non-Card nodes alone', () => {
    const tree = {
      'node-button': {
        displayName: 'Button',
        props: { nodeProps: { label: 'Click', intent: 'primary' } },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const out = JSON.parse(migrateDocument(doc).craftJson)
    expect(out['node-button'].props.nodeProps).toEqual({
      label: 'Click',
      intent: 'primary',
    })
  })

  it('flips persisted isCanvas:true on Card nodes to false', () => {
    const tree = {
      'node-card': {
        displayName: 'Card',
        isCanvas: true,
        props: { nodeProps: {} },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const out = JSON.parse(migrateDocument(doc).craftJson)
    expect(out['node-card'].isCanvas).toBe(false)
  })

  it('is idempotent on already-current Card nodes', () => {
    const tree = {
      'node-card': {
        displayName: 'Card',
        props: { nodeProps: {} },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const once = migrateDocument(doc)
    const twice = migrateDocument(once)
    expect(twice).toEqual(once)
  })

  it('returns the document unchanged if craftJson is malformed', () => {
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: '{not valid json',
    }
    expect(migrateDocument(doc)).toEqual(doc)
  })
})

describe('migrateDocument — Phase 7 Tabs content strip', () => {
  it('strips the `content` field from each tab entry on Tabs nodes', () => {
    const tree = {
      'node-tabs': {
        displayName: 'Tabs',
        props: {
          nodeProps: {
            tabs: [
              { value: 'a', label: 'A', content: 'A content' },
              { value: 'b', label: 'B', content: 'B content' },
            ],
            defaultValue: 'a',
          },
        },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const out = JSON.parse(migrateDocument(doc).craftJson)
    // Phase 10 also runs and injects `id` per tab. The v7 invariant is
    // that `content` is gone; the ids piggyback.
    expect(out['node-tabs'].props.nodeProps.tabs).toEqual([
      { id: 'a', value: 'a', label: 'A' },
      { id: 'b', value: 'b', label: 'B' },
    ])
    for (const t of out['node-tabs'].props.nodeProps.tabs) {
      expect(t).not.toHaveProperty('content')
    }
  })

  it('leaves non-Tabs nodes alone', () => {
    const tree = {
      'node-other': {
        displayName: 'Box',
        props: { nodeProps: { tabs: [{ value: 'a', content: 'should stay' }] } },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const out = JSON.parse(migrateDocument(doc).craftJson)
    // Box doesn't have a `tabs` prop in real life, but the migration must
    // only fire on Tabs.displayName — verify it didn't touch other nodes.
    expect(out['node-other'].props.nodeProps.tabs[0]).toHaveProperty('content')
  })

  it('is idempotent on already-current Tabs nodes', () => {
    const tree = {
      'node-tabs': {
        displayName: 'Tabs',
        props: {
          nodeProps: {
            tabs: [{ id: 'tab-a', value: 'a', label: 'A' }],
            defaultValue: 'a',
          },
        },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const once = migrateDocument(doc)
    const twice = migrateDocument(once)
    expect(twice).toEqual(once)
  })
})

// Phase 10 § 2.11 — Tabs gain a stable `id` field per tab so renaming
// `value` doesn't orphan canvas content. The migration injects ids that
// PRESERVE the slot key the pre-Phase-10 canvasSlots produced.
describe('migrateDocument — Phase 10 Tabs id injection', () => {
  it('injects id matching value for unique non-empty values', () => {
    const tree = {
      'node-tabs': {
        displayName: 'Tabs',
        props: {
          nodeProps: {
            tabs: [
              { value: 'overview', label: 'Overview' },
              { value: 'details', label: 'Details' },
            ],
            defaultValue: 'overview',
          },
        },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const out = JSON.parse(migrateDocument(doc).craftJson)
    const tabs = out['node-tabs'].props.nodeProps.tabs
    expect(tabs[0].id).toBe('overview')
    expect(tabs[1].id).toBe('details')
  })

  it('injects _unset_<index> ids for empty values (preserves the old slot key)', () => {
    const tree = {
      'node-tabs': {
        displayName: 'Tabs',
        props: {
          nodeProps: {
            tabs: [
              { value: '', label: 'A' },
              { value: '', label: 'B' },
            ],
            defaultValue: '',
          },
        },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const out = JSON.parse(migrateDocument(doc).craftJson)
    const tabs = out['node-tabs'].props.nodeProps.tabs
    expect(tabs[0].id).toBe('_unset_0')
    expect(tabs[1].id).toBe('_unset_1')
  })

  it('suffixes duplicate values the same way pre-Phase-10 canvasSlots did', () => {
    const tree = {
      'node-tabs': {
        displayName: 'Tabs',
        props: {
          nodeProps: {
            tabs: [
              { value: 'x', label: 'A' },
              { value: 'x', label: 'B' },
              { value: 'x', label: 'C' },
            ],
            defaultValue: 'x',
          },
        },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const out = JSON.parse(migrateDocument(doc).craftJson)
    const tabs = out['node-tabs'].props.nodeProps.tabs
    expect(tabs[0].id).toBe('x')
    expect(tabs[1].id).toBe('x__1')
    expect(tabs[2].id).toBe('x__2')
  })

  it('leaves existing ids alone', () => {
    const tree = {
      'node-tabs': {
        displayName: 'Tabs',
        props: {
          nodeProps: {
            tabs: [
              { id: 'pre-existing', value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
            defaultValue: 'a',
          },
        },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const out = JSON.parse(migrateDocument(doc).craftJson)
    const tabs = out['node-tabs'].props.nodeProps.tabs
    expect(tabs[0].id).toBe('pre-existing') // untouched
    expect(tabs[1].id).toBe('b') // injected
  })

  it('only fires on Tabs nodes, not other types', () => {
    const tree = {
      'node-other': {
        displayName: 'Box',
        props: {
          nodeProps: {
            tabs: [{ value: 'a', label: 'A' }], // a Box with a tabs-shaped prop
          },
        },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const out = JSON.parse(migrateDocument(doc).craftJson)
    // No id injected — migrateTabsIdsV10 ignored a non-Tabs node.
    expect(out['node-other'].props.nodeProps.tabs[0]).not.toHaveProperty('id')
  })

  it('is idempotent', () => {
    const tree = {
      'node-tabs': {
        displayName: 'Tabs',
        props: {
          nodeProps: {
            tabs: [
              { value: 'a', label: 'A' },
              { value: '', label: 'B' },
            ],
            defaultValue: 'a',
          },
        },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const once = migrateDocument(doc)
    const twice = migrateDocument(once)
    expect(twice).toEqual(once)
  })

  it('slot key after migration matches the pre-Phase-10 slot key', () => {
    // The whole point: documents survive the migration without losing
    // canvas children. The pre-Phase-10 slot key was
    // `tab-${uniqueTabValues(tabs)[i]}`; the post-Phase-10 slot key is
    // `tab-${tabs[i].id}`. The migration injects `id = uniqueTabValues[i]`
    // so the two strings match.
    const tree = {
      'node-tabs': {
        displayName: 'Tabs',
        props: {
          nodeProps: {
            tabs: [
              { value: 'a', label: 'A' },
              { value: '', label: 'B' },
              { value: 'a', label: 'C' }, // duplicate
            ],
            defaultValue: 'a',
          },
        },
      },
    }
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(tree),
    }
    const out = JSON.parse(migrateDocument(doc).craftJson)
    const tabs = out['node-tabs'].props.nodeProps.tabs
    // The post-Phase-10 slot key is `tab-<id>`; the pre-Phase-10 slot key
    // was `tab-<uniqueTabValues[i]>`. Asserting id === unique-value
    // proves the slot keys are identical.
    expect(tabs[0].id).toBe('a')
    expect(tabs[1].id).toBe('_unset_1')
    expect(tabs[2].id).toBe('a__1')
  })
})

// Phase 14 § 6.4 — the versioned pipeline: steps run only when their
// target version exceeds the document's stamped version, and the output
// is re-stamped to CURRENT.
describe('migrateDocument — version gating', () => {
  const staleCardTree = {
    'node-card': {
      displayName: 'Card',
      isCanvas: true,
      props: { nodeProps: { title: 'stale' } },
    },
  }

  it('re-stamps the output to CURRENT_DOCUMENT_VERSION', () => {
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify({ ROOT: { displayName: 'Box', props: {} } }),
    }
    expect(migrateDocument(doc).version).toBe(CURRENT_DOCUMENT_VERSION)
  })

  it('runs content steps on a version-1 document', () => {
    const doc = {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(staleCardTree),
    }
    const out = JSON.parse(migrateDocument(doc).craftJson)
    expect(out['node-card'].props.nodeProps).toEqual({})
    expect(out['node-card'].isCanvas).toBe(false)
  })

  it('does NOT re-run content steps on a CURRENT-version document', () => {
    // A document already stamped at CURRENT keeps its tree verbatim — the
    // v2 step is gated out. (Hand-authored stale shape at v2 is the
    // designer's responsibility; the stamp is the contract.)
    const doc = {
      version: CURRENT_DOCUMENT_VERSION,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(staleCardTree),
    }
    const out = JSON.parse(migrateDocument(doc).craftJson)
    expect(out['node-card'].props.nodeProps).toEqual({ title: 'stale' })
    expect(out['node-card'].isCanvas).toBe(true)
  })

  it('treats a missing version as 0 and runs every step', () => {
    const doc = {
      adapterId: 'shadcn',
      craftJson: JSON.stringify(staleCardTree),
    } as unknown as Parameters<typeof migrateDocument>[0]
    const out = JSON.parse(migrateDocument(doc).craftJson)
    expect(out['node-card'].props.nodeProps).toEqual({})
  })
})
