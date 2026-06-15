// @vitest-environment jsdom
//
// Phase 26 — <DocumentRenderer variables> substitutes `{{ template }}` tokens
// in text content (via EditableText's display mode), through the real Craft
// preview pipeline with the dependency-free HTML adapter.
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
const mount = (ui: React.ReactElement) => {
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
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const doc = () =>
  buildDocument({
    root: {
      canonical: 'box',
      children: [{ canonical: 'heading', nodeProps: { content: 'Hi {{ contact.name }}' } }],
    },
    adapterId: 'html',
  })

describe('<DocumentRenderer variables>', () => {
  it('substitutes a real value (nested dot-path)', () => {
    mount(<DocumentRenderer document={doc()} adapter="html" variables={{ contact: { name: 'Jane' } }} />)
    expect(container.textContent).toContain('Hi Jane')
    expect(container.textContent).not.toContain('{{')
  })

  it('keeps the raw token when no variables are passed', () => {
    mount(<DocumentRenderer document={doc()} adapter="html" />)
    expect(container.textContent).toContain('Hi {{ contact.name }}')
  })

  it('keeps the raw token for an unresolved variable', () => {
    mount(<DocumentRenderer document={doc()} adapter="html" variables={{ other: 'x' }} />)
    expect(container.textContent).toContain('Hi {{ contact.name }}')
  })
})
