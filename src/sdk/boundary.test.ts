import { describe, expect, it } from 'vitest'
import * as sdk from './index'

// Boundary test — verifies the public SDK exports the names external authors
// depend on. Catches accidental removal during refactors. If you add a new
// SDK export, add it here too.

const EXPECTED_FUNCTIONS = [
  'registerAdapter',
  'listAdapters',
  'useActiveAdapter',
  'registerCanonical',
  'registerComponent',
  'unregisterCanonical',
  'listComponents',
  'getComponent',
  'getComponentByDisplayName',
  'getApplicablePanels',
  'getCanvasSlots',
  'useNodeClasses',
  'registerPanel',
  'unregisterPanel',
  'listPanels',
  'getPanelsFor',
  // Phase 11 § 3.10 — asset backend integration.
  'EditorImageProvider',
  'useEditorImageProvider',
] as const

describe('SDK public boundary', () => {
  for (const name of EXPECTED_FUNCTIONS) {
    it(`exports ${name}`, () => {
      expect(typeof (sdk as Record<string, unknown>)[name]).toBe('function')
    })
  }

  it('does not leak internal symbols', () => {
    // CanonicalNode is the internal Craft bridge — leaking it would let
    // external code mount nodes outside the editor's render flow. Keep out.
    expect('CanonicalNode' in sdk).toBe(false)
    // buildResolver / getResolver are internal Craft resolver plumbing.
    expect('buildResolver' in sdk).toBe(false)
    expect('getResolver' in sdk).toBe(false)
    // Phase 7 — registry version + subscribe are internal hot-reload plumbing
    // for the Editor's ResolverUpdater. SDK consumers don't subscribe directly;
    // their registerCanonical calls drive the bump for them.
    expect('getRegistryVersion' in sdk).toBe(false)
    expect('subscribeRegistry' in sdk).toBe(false)
  })
})
