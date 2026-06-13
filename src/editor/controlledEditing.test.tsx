// @vitest-environment jsdom
//
// Phase 23 Group A — the controlled-component contract, exercised against the
// REAL Craft engine (mounted under jsdom with the dependency-free HTML
// adapter), mirroring headless/roundtrip.test.tsx. Covers: re-seed on `value`
// identity change, onChange on a structural edit AND a prop edit (the resolved
// open question), and the onChange→value→apply loop guard.
import { Editor as Craft, Element, Frame, useEditor } from '@craftjs/core'
import { createRoot, type Root } from 'react-dom/client'
import { act, useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/registry/components'
import '@/adapters/html'
import { AdapterProvider } from '@/adapters/AdapterContext'
import { getResolver } from '@/craft/resolver'
import { getComponent } from '@/registry/registry'
import { useEditorStore } from '@/state/editorStore'
import { buildDocument } from '@/headless/build'
import type { EditorDocument } from '@/persistence/schema'
import { ControlledHydrator } from './ControlledHydrator'
import { useDocumentChangeEmitter } from './useDocumentChangeEmitter'
import { _resetQueueForTests } from './errors/applyEnvelopeSafely'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let captured: ReturnType<typeof useEditor> | null = null
function Probe() {
  const editor = useEditor()
  useEffect(() => {
    captured = editor
  })
  return null
}

const DEBOUNCE = 10

function Harness({
  value,
  onChange,
}: {
  value: EditorDocument | string
  onChange?: (doc: EditorDocument) => void
}) {
  const { onNodesChange, serializedRef } = useDocumentChangeEmitter(
    onChange,
    DEBOUNCE,
  )
  const resolver = getResolver()
  const boxDef = getComponent('box')!
  const Root = resolver[boxDef.displayName]
  return (
    <AdapterProvider>
      <Craft
        resolver={resolver}
        onNodesChange={onChange ? onNodesChange : undefined}
      >
        <ControlledHydrator value={value} serializedRef={serializedRef} />
        <Probe />
        <Frame>
          <Element
            is={Root}
            canvas
            nodeProps={boxDef.defaults.props}
            style={boxDef.defaults.style}
          />
        </Frame>
      </Craft>
    </AdapterProvider>
  )
}

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

const flush = async (ms = 0) => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

// Find the heading node id in the serialized tree by its content prop.
// Canonical nodes store authored props under `props.nodeProps`.
function headingIdWithContent(json: string, content: string): string | null {
  const map = JSON.parse(json) as Record<
    string,
    { props?: { nodeProps?: { content?: unknown } } }
  >
  for (const [id, node] of Object.entries(map)) {
    if (node.props?.nodeProps?.content === content) return id
  }
  return null
}

beforeEach(() => {
  _resetQueueForTests()
  captured = null
  useEditorStore.getState().setActiveAdapter('html')
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  container?.remove()
})

describe('controlled <Editor value> (real Craft)', () => {
  it('re-seeds the canvas when `value` identity changes', async () => {
    await act(async () => {
      root = createRoot(container)
      root.render(<Harness value={docWith('Alpha')} />)
    })
    await flush()
    expect(captured!.query.serialize()).toContain('Alpha')

    // Host swaps to a different document (the SPA-steps-to-a-new-form case).
    await act(async () => {
      root!.render(<Harness value={docWith('Bravo')} />)
    })
    await flush()
    const after = captured!.query.serialize()
    expect(after).toContain('Bravo')
    expect(after).not.toContain('Alpha')
  })

  it('fires onChange on a prop edit (setProp) AND a structural edit (delete)', async () => {
    const onChange = vi.fn()
    await act(async () => {
      root = createRoot(container)
      root.render(<Harness value={docWith('Alpha')} onChange={onChange} />)
    })
    await flush(DEBOUNCE + 20)
    // The initial programmatic seed is NOT a user change — it must not emit.
    onChange.mockClear()

    // --- prop edit (the resolved open question: onNodesChange fires on setProp)
    const headingId = headingIdWithContent(
      captured!.query.serialize(),
      'Alpha',
    )!
    expect(headingId).toBeTruthy()
    await act(async () => {
      captured!.actions.setProp(
        headingId,
        (props: { nodeProps?: { content?: string } }) => {
          props.nodeProps!.content = 'Edited'
        },
      )
    })
    await flush(DEBOUNCE + 20)
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls.at(-1)![0].craftJson).toContain('Edited')

    onChange.mockClear()

    // --- structural edit (delete the heading)
    await act(async () => {
      captured!.actions.delete(headingId)
    })
    await flush(DEBOUNCE + 20)
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls.at(-1)![0].craftJson).not.toContain('Edited')
  })

  it('does not loop when the host echoes the emitted value back', async () => {
    const onChange = vi.fn()
    await act(async () => {
      root = createRoot(container)
      root.render(<Harness value={docWith('Alpha')} onChange={onChange} />)
    })
    await flush(DEBOUNCE + 20)
    onChange.mockClear()

    // Make a real edit → onChange emits an envelope E.
    const headingId = headingIdWithContent(
      captured!.query.serialize(),
      'Alpha',
    )!
    await act(async () => {
      captured!.actions.setProp(
        headingId,
        (props: { nodeProps?: { content?: string } }) => {
          props.nodeProps!.content = 'Looped'
        },
      )
    })
    await flush(DEBOUNCE + 20)
    const emitted: EditorDocument = onChange.mock.calls.at(-1)![0]
    const callsAfterEdit = onChange.mock.calls.length

    // Host feeds E straight back as the new controlled value (the loop trap).
    await act(async () => {
      root!.render(<Harness value={emitted} onChange={onChange} />)
    })
    await flush(DEBOUNCE + 40)

    // The echo must NOT re-apply (craftJson already matches serializedRef) and
    // must NOT spawn further onChange emissions.
    expect(onChange.mock.calls.length).toBe(callsAfterEdit)
    expect(captured!.query.serialize()).toContain('Looped')
  })
})
