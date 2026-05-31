import { describe, expect, it } from 'vitest'

// Phase 17 § 8.4 — the SDK barrel must stay SIDE-EFFECT-FREE so consumers can
// tree-shake it. The package's `sideEffects` allowlist (package.json) does NOT
// list `src/sdk/**`, which tells bundlers every SDK module is pure and unused
// re-exports across the `export * from './adapter'` (etc.) boundary can be
// dropped. That promise only holds if importing the barrel registers nothing:
// the moment an SDK module gains a registration side-effect import (e.g.
// `import '../adapters/shadcn'`), importing one SDK symbol would drag in every
// adapter/canonical and the tree-shaking guarantee breaks.
//
// This test is that guard. It imports the whole SDK barrel and asserts every
// registry is still empty — i.e. the import did no work. Vitest isolates each
// test file's module graph, so these registries are populated only if the SDK
// itself populated them.
import * as sdk from './index'

import { listComponents } from '@/registry/registry'
import { listAdapters } from '@/adapters/AdapterContext'
import { listFontTokens } from '@/registry/fonts'
import { listPanels } from '@/editor/inspector/panel-registry'
import { listThemes } from '@/themes/registry'
import { listTemplates } from '@/persistence/templates/registry'

describe('SDK barrel is side-effect-free (tree-shakable)', () => {
  it('exposes a non-empty authoring surface (import resolved)', () => {
    // Sanity: the barrel really did load.
    expect(typeof sdk.registerCanonical).toBe('function')
  })

  it('importing the SDK registers no canonicals', () => {
    expect(listComponents()).toHaveLength(0)
  })

  it('importing the SDK registers no adapters', () => {
    expect(listAdapters()).toHaveLength(0)
  })

  it('importing the SDK registers no panels', () => {
    expect(listPanels()).toHaveLength(0)
  })

  it('importing the SDK registers no themes', () => {
    expect(listThemes()).toHaveLength(0)
  })

  it('importing the SDK registers no templates', () => {
    expect(listTemplates()).toHaveLength(0)
  })

  // The ONE deliberate carry: `registry/fonts.ts` self-registers the editor's
  // three baseline font tokens (sans / heading / mono → the CSS vars in
  // index.css) at module load, and the SDK re-exports the font registration
  // functions from it. `registry/fonts.ts` is in package.json `sideEffects`
  // on purpose, so this is preserved by design — but it must stay exactly
  // these three and never grow into heavier registration. Locked here.
  it('importing the SDK registers ONLY the 3 built-in font tokens', () => {
    expect(listFontTokens().map((f) => f.id).sort()).toEqual([
      'heading',
      'mono',
      'sans',
    ])
  })
})
