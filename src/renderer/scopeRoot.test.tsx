// @vitest-environment jsdom
//
// Phase 24 Group A — scope plumbing + portal routing.
//
//   1. <Editor> and <DocumentRenderer> wrap their output in `.crafted-design-scope`.
//   2. THE CRUX: a runtime overlay (which createPortals out to the body, away
//      from the editor subtree) lands inside the scope-classed portal root, not
//      bare <body> — so the opt-in scoped stylesheet still reaches it.
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import '@/registry/components'
import '@/adapters/html'
import { useEditorStore } from '@/state/editorStore'
import { buildDocument } from '@/headless/build'
import { Editor } from '@/editor/Editor'
import { DocumentRenderer } from './DocumentRenderer'
import { SCOPE_CLASS } from '@/style/scope'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root | null = null

const mount = async (node: React.ReactElement) => {
  await act(async () => {
    root = createRoot(container)
    root.render(node)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50))
  })
}

beforeEach(() => {
  useEditorStore.getState().setActiveAdapter('html')
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  container?.remove()
  document.getElementById('crafted-design-portal-root')?.remove()
})

describe('scope root', () => {
  it('<Editor> wraps its entire output in the scope class', async () => {
    await mount(<Editor adapter="html" persistence={false} />)
    // The outermost editor DOM node is the scope wrapper.
    expect(container.firstElementChild?.classList.contains(SCOPE_CLASS)).toBe(
      true,
    )
    // Sibling chrome (e.g. the canvas) lives under it.
    const scoped = container.querySelector(`.${SCOPE_CLASS}`)!
    expect(scoped.querySelector('[data-onboarding-target="canvas"]')).not.toBeNull()
  })

  it('<DocumentRenderer> wraps its output in the scope class', async () => {
    const doc = buildDocument({
      root: { canonical: 'box', children: [{ canonical: 'heading', nodeProps: { content: 'Hi' } }] },
      adapterId: 'html',
    })
    await mount(<DocumentRenderer document={doc} adapter="html" />)
    expect(container.firstElementChild?.classList.contains(SCOPE_CLASS)).toBe(
      true,
    )
  })

  it('a runtime overlay portals INTO the scoped root, not bare <body> (the crux)', async () => {
    // A modal open by default → at runtime (DocumentRenderer = enabled=false)
    // it createPortals to the scoped root instead of document.body.
    const doc = buildDocument({
      root: {
        canonical: 'box',
        children: [
          {
            canonical: 'modal',
            nodeProps: { name: 'm1', title: 'Hello', defaultOpen: true },
          },
        ],
      },
      adapterId: 'html',
    })
    await mount(<DocumentRenderer document={doc} adapter="html" />)

    const portalRoot = document.getElementById('crafted-design-portal-root')
    expect(portalRoot).not.toBeNull()
    expect(portalRoot!.classList.contains(SCOPE_CLASS)).toBe(true)
    // The open modal's dialog is inside the scoped portal root.
    const dialog = portalRoot!.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    // And it is NOT a direct child of <body> (i.e. it didn't escape the scope).
    expect(dialog!.closest(`.${SCOPE_CLASS}`)).toBe(portalRoot)
  })
})
