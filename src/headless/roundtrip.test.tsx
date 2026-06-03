// @vitest-environment jsdom
//
// Phase 21 — THE Craft-compat gate: a headlessly-built document (Pattern A +
// Pattern B card slots + Table slotComponent cells) is fed to the REAL
// Craft.js editor (mounted under jsdom with the dependency-free HTML adapter),
// then read back via `query.serialize()`. If the builder's node shape ever
// drifts from what Craft accepts (linkedNodes wiring especially), this fails —
// not a structural approximation, the actual engine.
import { Editor as Craft, Frame, useEditor } from '@craftjs/core'
import { createRoot, type Root } from 'react-dom/client'
import { act, useEffect } from 'react'
import { afterEach, beforeAll, expect, it } from 'vitest'

import '@/registry/components'
import '@/adapters/html'
import { AdapterProvider } from '@/adapters/AdapterContext'
import { getResolver } from '@/craft/resolver'
import { useEditorStore } from '@/state/editorStore'
import { buildDocument } from './build'

// React act() bookkeeping for a manual createRoot mount.
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// Capture Craft's query object; serialize AFTER act() so <Frame data> has
// deserialized (it loads in an effect — serializing during the first render
// would see the empty initial state).
let capturedQuery: { serialize(): string } | null = null
function SerializeProbe() {
  const { query } = useEditor()
  // Capture in an effect (not during render — react-hooks/globals); act()
  // flushes effects before the assertions run.
  useEffect(() => {
    capturedQuery = query
  })
  return null
}

let container: HTMLDivElement
let root: Root | null = null

beforeAll(() => {
  // The dogfood default adapter is shadcn; only the HTML adapter is imported
  // here (no MUI/emotion needed under jsdom).
  useEditorStore.getState().setActiveAdapter('html')
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  container?.remove()
})

it('a built Pattern A + B document loads into the real Craft editor and round-trips', () => {
  const doc = buildDocument({
    root: {
      canonical: 'box',
      children: [
        { canonical: 'heading', nodeProps: { content: 'Pricing' } },
        {
          canonical: 'card',
          slots: {
            header: [{ canonical: 'heading', nodeProps: { content: 'Pro' } }],
            body: [{ canonical: 'text' }],
          },
        },
        { canonical: 'table' },
        { canonical: 'button', nodeProps: { label: 'Buy' } },
      ],
    },
    adapterId: 'html',
  })

  capturedQuery = null
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    root = createRoot(container)
    root.render(
      <AdapterProvider>
        <Craft resolver={getResolver()} enabled={true}>
          <SerializeProbe />
          <Frame data={doc.craftJson} />
        </Craft>
      </AdapterProvider>,
    )
  })

  // Craft deserialized our map and re-serialized it.
  expect(capturedQuery).toBeTruthy()
  const tree = JSON.parse(capturedQuery!.serialize())

  // Every node we built survived with structure intact.
  const built = JSON.parse(doc.craftJson)
  for (const id of Object.keys(built)) {
    expect(tree[id], `node ${id} lost by Craft`).toBeDefined()
  }
  expect(tree.ROOT.nodes).toEqual(built.ROOT.nodes)
  // Card's linked slot containers are still linked + parented.
  expect(tree['card-1'].linkedNodes).toEqual(built['card-1'].linkedNodes)
  const headerId = tree['card-1'].linkedNodes.header
  expect(tree[headerId].parent).toBe('card-1')
  expect(tree[headerId].nodes).toEqual(built[headerId].nodes)
  // Table's slotComponent cells survived as Table Cell nodes.
  const cellId = Object.values(
    tree['table-1'].linkedNodes as Record<string, string>,
  )[0]
  expect(tree[cellId].type).toEqual({ resolvedName: 'Table Cell' })

  // And the content actually RENDERED through the HTML adapter.
  expect(container.textContent).toContain('Pricing')
  expect(container.textContent).toContain('Pro')
  expect(container.textContent).toContain('Buy')
})
