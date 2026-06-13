// @vitest-environment jsdom
//
// Phase 23 Group C (P5) — the imperative ref on the REAL <Editor>: read the
// live document on demand and set it programmatically.
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, expect, it } from 'vitest'

import '@/registry/components'
import '@/adapters/html'
import { useEditorStore } from '@/state/editorStore'
import { buildDocument } from '@/headless/build'
import { Editor, type EditorHandle } from './Editor'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const docWith = (content: string) =>
  buildDocument({
    root: {
      canonical: 'box',
      children: [{ canonical: 'heading', nodeProps: { content } }],
    },
    adapterId: 'html',
  })

let container: HTMLDivElement
let root: Root | null = null

const settle = async () => {
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
})

it('getDocument() reads the live canvas; setDocument() replaces it', async () => {
  const ref: { current: EditorHandle | null } = { current: null }
  await act(async () => {
    root = createRoot(container)
    root.render(
      <Editor
        ref={ref}
        adapter="html"
        persistence={false}
        defaultValue={docWith('Alpha')}
      />,
    )
  })
  await settle()

  expect(ref.current).not.toBeNull()
  // Read the seeded document.
  const read = ref.current!.getDocument()
  expect(read.craftJson).toContain('Alpha')
  expect(read.adapterId).toBe('html')

  // Programmatically replace it.
  await act(async () => {
    ref.current!.setDocument(docWith('Bravo'))
  })
  await settle()

  const after = ref.current!.getDocument()
  expect(after.craftJson).toContain('Bravo')
  expect(after.craftJson).not.toContain('Alpha')
})

it('setDocument() accepts a JSON string', async () => {
  const ref: { current: EditorHandle | null } = { current: null }
  await act(async () => {
    root = createRoot(container)
    root.render(<Editor ref={ref} adapter="html" persistence={false} />)
  })
  await settle()

  await act(async () => {
    ref.current!.setDocument(JSON.stringify(docWith('FromString')))
  })
  await settle()
  expect(ref.current!.getDocument().craftJson).toContain('FromString')
})
