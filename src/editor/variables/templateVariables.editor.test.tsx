// @vitest-environment jsdom
//
// Phase 26 Group B — the editor canvas previews template values and marks
// nodes that contain `{{ tokens }}`. Mounts the REAL <Editor> (html adapter)
// wrapped in EditorTemplateVariablesProvider; asserts the resolved value shows
// and the node carries the editor-only marker class — while the renderer
// (DocumentRenderer, not editing) shows the value WITHOUT the marker.
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import '@/registry/components'
import '@/adapters/html'
import { useEditorStore } from '@/state/editorStore'
import { buildDocument } from '@/headless/build'
import { Editor } from '../Editor'
import { DocumentRenderer } from '@/renderer/DocumentRenderer'
import { EditorTemplateVariablesProvider } from './EditorTemplateVariablesProvider'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const doc = () =>
  buildDocument({
    root: {
      canonical: 'box',
      children: [{ canonical: 'heading', nodeProps: { content: 'Hi {{ contact.name }}' } }],
    },
    adapterId: 'html',
  })

const VARS = [{ key: 'contact.name', label: 'Full name', sample: 'Jane Doe' }]

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
  localStorage.setItem('craftjs-design.onboarding-completed:v1', '1')
  useEditorStore.getState().setActiveAdapter('html')
  container = document.createElement('div')
  document.body.appendChild(container)
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  container?.remove()
})

describe('template variables — editor canvas', () => {
  it('previews the sample value and marks the dynamic node', async () => {
    await mount(
      <EditorTemplateVariablesProvider variables={VARS}>
        <Editor adapter="html" value={doc()} persistence={false} hideChrome />
      </EditorTemplateVariablesProvider>,
    )
    const marked = container.querySelector('.crafted-design-has-var')
    expect(marked).not.toBeNull()
    expect(marked!.textContent).toBe('Hi Jane Doe') // sample substituted
    expect(container.querySelector('[data-onboarding-target="canvas"]')!.textContent).not.toContain('{{')
  })

  it('prefers a live value over the sample', async () => {
    await mount(
      <EditorTemplateVariablesProvider variables={VARS} values={{ 'contact.name': 'Sam Live' }}>
        <Editor adapter="html" value={doc()} persistence={false} hideChrome />
      </EditorTemplateVariablesProvider>,
    )
    expect(container.querySelector('.crafted-design-has-var')!.textContent).toBe('Hi Sam Live')
  })

  it('the renderer shows the value but NO editor marker', async () => {
    await mount(
      <DocumentRenderer document={doc()} adapter="html" variables={{ 'contact.name': 'Jane' }} />,
    )
    expect(container.textContent).toContain('Hi Jane')
    expect(container.querySelector('.crafted-design-has-var')).toBeNull()
  })
})
