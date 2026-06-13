// @vitest-environment jsdom
//
// Phase 23 Group B — `hideChrome` drops the document-management chrome (the
// top Save/Load bar, persistence banners, onboarding tour, cross-tab watcher)
// while keeping the editing surface (toolbox, canvas, inspector). Mounts the
// REAL <Editor> under jsdom. Both cases run with persistence={false} so the
// store is never touched — `hideChrome` is the only variable.
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import '@/registry/components'
import '@/adapters/html'
import { useEditorStore } from '@/state/editorStore'
import { Editor } from './Editor'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root | null = null

const mount = async (node: React.ReactElement) => {
  await act(async () => {
    root = createRoot(container)
    root.render(node)
  })
  // settle effects (hydration, layout effects)
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

const savebar = () =>
  container.querySelector('[data-onboarding-target="savebar"]')
const canvas = () =>
  container.querySelector('[data-onboarding-target="canvas"]')
const loadingVeil = () =>
  container.querySelector('[role="status"]')

describe('<Editor hideChrome>', () => {
  it('renders the Save/Load bar by default', async () => {
    await mount(<Editor adapter="html" persistence={false} />)
    expect(savebar()).not.toBeNull()
    expect(canvas()).not.toBeNull()
  })

  it('hides the Save/Load bar but keeps the canvas under hideChrome', async () => {
    await mount(<Editor adapter="html" persistence={false} hideChrome />)
    expect(savebar()).toBeNull()
    expect(canvas()).not.toBeNull()
  })

  it('shows no loading veil when persistence is off (store never bootstrapped)', async () => {
    await mount(<Editor adapter="html" persistence={false} />)
    expect(loadingVeil()).toBeNull()
  })
})
