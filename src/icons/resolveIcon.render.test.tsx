// @vitest-environment jsdom
//
// Phase 27 Group B — runtime proof that the resolver renders REAL glyphs (not
// just a valid element). DynamicIcon loads the glyph in an effect via a dynamic
// import, so we mount, let the effect resolve, then assert on the rendered SVG
// geometry (lucide's base Icon emits only class "lucide", no per-name class —
// so we distinguish glyphs structurally):
//   • shopping-cart (NOT in the old 16-name enum) → has <circle> wheels
//   • star          (legacy quick-pick)           → renders, no fallback <rect>
//   • unknown name                                → fallback Square (<rect>)
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveIcon } from './resolver'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root | null = null

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  container?.remove()
})

// Mount the resolved node, then poll (DynamicIcon's effect does an async import)
// until the predicate holds or we give up.
async function mountIcon(name: string, until: () => boolean) {
  await act(async () => {
    root = createRoot(container)
    root.render(<>{resolveIcon(name, 20)}</>)
  })
  for (let i = 0; i < 40 && !until(); i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 25))
    })
  }
}

const svg = () => container.querySelector('svg')

describe('resolveIcon renders real glyphs (runtime)', () => {
  it('renders a non-legacy lucide glyph (shopping-cart) — impossible under the old enum', async () => {
    await mountIcon('shopping-cart', () => !!svg()?.querySelector('circle'))
    expect(svg()).not.toBeNull()
    // shopping-cart has two wheel <circle>s — proves the real glyph loaded,
    // not the fallback Square (which is a <rect>).
    expect(svg()!.querySelectorAll('circle').length).toBeGreaterThanOrEqual(1)
    expect(svg()!.querySelector('rect')).toBeNull()
  })

  it('renders a legacy glyph (star) — not the fallback', async () => {
    await mountIcon('star', () => (svg()?.children.length ?? 0) > 0)
    expect(svg()).not.toBeNull()
    expect(svg()!.children.length).toBeGreaterThan(0)
    expect(svg()!.querySelector('rect')).toBeNull() // fallback Square is a <rect>
  })

  it('unknown name → fallback Square glyph (keeps rendering, never throws)', async () => {
    await mountIcon('definitely-not-an-icon', () => !!svg()?.querySelector('rect'))
    expect(svg()).not.toBeNull()
    expect(svg()!.querySelector('rect')).not.toBeNull() // Square fallback
    expect(svg()!.querySelector('circle')).toBeNull()
  })
})
