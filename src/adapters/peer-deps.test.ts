import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { getAdapter } from '@/adapters/AdapterContext'

// Side-effect imports register the adapters.
import '@/adapters/shadcn'
import '@/adapters/mui'
import '@/adapters/html'

// Phase 16 § 7.4 — peer-dependency policy guard.
//
// An adapter that needs an external npm package declares it in
// `peerDependencies` (canonical-id → tested semver range). For the package's
// OWN bundled adapters those declarations must agree with the package's
// optional `peerDependencies` in package.json — otherwise the docs/matrix and
// the install contract drift apart. This test is that contract.

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '..', '..', 'package.json'), 'utf8'),
) as {
  peerDependencies: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

describe('adapter peer dependencies', () => {
  it('shadcn + html declare no external peers (they use bundled deps)', () => {
    expect(getAdapter('shadcn')?.peerDependencies).toBeUndefined()
    expect(getAdapter('html')?.peerDependencies).toBeUndefined()
  })

  it('mui declares MUI + Emotion as peers', () => {
    const peers = getAdapter('mui')?.peerDependencies ?? {}
    expect(Object.keys(peers).sort()).toEqual([
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
    ])
  })

  it('every peer an adapter declares matches the package.json peer range', () => {
    for (const id of ['mui']) {
      const peers = getAdapter(id)?.peerDependencies ?? {}
      for (const [name, range] of Object.entries(peers)) {
        expect(
          pkg.peerDependencies[name],
          `${id} declares ${name}@${range}; package.json must list it as a peer`,
        ).toBeDefined()
        // Ranges should be compatible — the adapter's tested range is the same
        // major the package promises. Compare leading "^N" tokens.
        const major = (r: string) => r.match(/\d+/)?.[0]
        expect(major(pkg.peerDependencies[name])).toBe(major(range))
      }
    }
  })

  it("the package's heavy peers are all marked optional", () => {
    const optional = pkg.peerDependenciesMeta ?? {}
    for (const name of ['@mui/material', '@emotion/react', '@emotion/styled']) {
      expect(optional[name]?.optional, `${name} must be an optional peer`).toBe(
        true,
      )
    }
  })
})
