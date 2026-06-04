// @vitest-environment jsdom
//
// Phase 21 — <DocumentRenderer> renders saved documents standalone (no
// editor). Documents come from the headless builder, so this also covers the
// build → render pipeline end to end with the dependency-free HTML adapter.
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import '@/registry/components'
import '@/themes'
import '@/adapters/html'
import { buildDocument } from '@/headless/build'
import { DocumentRenderer } from './DocumentRenderer'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root | null = null

function mount(ui: React.ReactElement) {
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    root = createRoot(container)
    root.render(ui)
  })
}

afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  container?.remove()
  vi.restoreAllMocks()
})

beforeAll(() => {
  // The fallbacks log intentionally; keep test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const doc = () =>
  buildDocument({
    root: {
      canonical: 'box',
      children: [
        { canonical: 'heading', nodeProps: { content: 'Launch page' } },
        {
          canonical: 'card',
          slots: {
            body: [{ canonical: 'text', nodeProps: { content: 'Card body' } }],
          },
        },
        { canonical: 'button', nodeProps: { label: 'Go' } },
      ],
    },
    adapterId: 'html',
    themeId: 'rose',
    colorMode: 'dark',
  })

describe('DocumentRenderer', () => {
  it('renders a saved document with no editor chrome', () => {
    mount(<DocumentRenderer document={doc()} />)
    expect(container.textContent).toContain('Launch page')
    expect(container.textContent).toContain('Card body')
    expect(container.textContent).toContain('Go')
    // No editor chrome anywhere.
    expect(container.querySelector('[data-onboarding-target]')).toBeNull()
    expect(container.textContent).not.toContain('Components')
  })

  it('accepts the JSON string form', () => {
    mount(<DocumentRenderer document={JSON.stringify(doc())} />)
    expect(container.textContent).toContain('Launch page')
  })

  it('scopes the document theme + color mode to its wrapper', () => {
    mount(<DocumentRenderer document={doc()} className="my-page" />)
    const wrapper = container.firstElementChild!
    expect(wrapper.getAttribute('data-theme')).toBe('rose')
    expect(wrapper.classList.contains('dark')).toBe(true)
    expect(wrapper.classList.contains('my-page')).toBe(true)
  })

  it('the adapter prop overrides the envelope adapterId per instance', () => {
    // Envelope says a bogus adapter; the prop pins the registered one.
    const d = { ...doc(), adapterId: 'mui' } // mui NOT imported in this test
    mount(<DocumentRenderer document={d} adapter="html" />)
    expect(container.textContent).toContain('Launch page')
  })

  it('falls back to a registered adapter when the document’s adapter is missing', () => {
    // Document saved with shadcn, but only html is registered in this test —
    // common when a host imports a different adapter than the doc was saved
    // with. It should render (via html), not error.
    const d = { ...doc(), adapterId: 'shadcn' }
    mount(<DocumentRenderer document={d} />)
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.textContent).toContain('Launch page')
  })

  it('errors when an EXPLICIT adapter prop is not registered', () => {
    mount(<DocumentRenderer document={doc()} adapter="mui" />)
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    expect(container.textContent).toContain('not registered')
  })

  it('falls back gracefully on a malformed document', () => {
    mount(<DocumentRenderer document={'{"not": "an envelope"}'} />)
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('re-renders when the document prop changes', () => {
    const first = doc()
    mount(<DocumentRenderer document={first} />)
    expect(container.textContent).toContain('Launch page')
    const second = buildDocument({
      root: {
        canonical: 'box',
        children: [
          { canonical: 'heading', nodeProps: { content: 'Second page' } },
        ],
      },
      adapterId: 'html',
    })
    act(() => {
      root!.render(<DocumentRenderer document={second} />)
    })
    expect(container.textContent).toContain('Second page')
    expect(container.textContent).not.toContain('Launch page')
  })
})
