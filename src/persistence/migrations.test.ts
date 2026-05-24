import { describe, expect, it } from 'vitest'
import { migrateDocument } from './migrations'

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
    expect(out['node-tabs'].props.nodeProps.tabs).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ])
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
            tabs: [{ value: 'a', label: 'A' }],
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
