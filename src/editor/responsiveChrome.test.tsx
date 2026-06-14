// @vitest-environment jsdom
//
// Phase 25 Group B — the responsive panel wiring on the REAL <Editor>:
// docked columns at ≥lg, overlay drawers + toolbar toggles below lg, and the
// tabified right panel (Properties/Overlays) keeping the overlay-stage portal
// target mounted.
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import '@/registry/components'
import '@/adapters/html'
import { useEditorStore } from '@/state/editorStore'
import { Editor } from './Editor'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function installMatchMedia(width: number) {
  const minOf = (q: string) => Number(/min-width:\s*(\d+)/.exec(q)?.[1] ?? 0)
  window.matchMedia = ((query: string) =>
    ({
      matches: width >= minOf(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
}

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
  // Suppress the first-load onboarding tour (it renders its own role=dialog,
  // which would otherwise collide with the drawer-dialog assertions).
  localStorage.setItem('craftjs-design.onboarding-completed:v1', '1')
  useEditorStore.getState().setActiveAdapter('html')
  useEditorStore.getState().closeAllPanels()
  container = document.createElement('div')
  document.body.appendChild(container)
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  container?.remove()
})

const q = (sel: string) => container.querySelector(sel)

describe('responsive editor chrome', () => {
  it('≥ lg: panels are docked columns — toolbox + tabified right panel, no drawers/toggles', async () => {
    installMatchMedia(1440)
    await mount(<Editor adapter="html" persistence={false} />)

    expect(q('[data-onboarding-target="toolbox"]')).not.toBeNull()
    expect(q('[data-onboarding-target="inspector"]')).not.toBeNull()
    // Tabified right panel: both tabpanels + the overlay-stage portal target.
    expect(q('#right-panel-properties')).not.toBeNull()
    expect(q('#right-panel-overlays')).not.toBeNull()
    expect(q('#craftjs-overlay-stage')).not.toBeNull()
    // No overlay drawers, no toggle buttons.
    expect(q('[role="dialog"]')).toBeNull()
    expect(q('[aria-label="Open components and layers"]')).toBeNull()
    expect(q('[aria-label="Open inspector"]')).toBeNull()
  })

  it('< lg: panels are closed drawers with toolbar toggles; toggling opens a drawer', async () => {
    installMatchMedia(600)
    await mount(<Editor adapter="html" persistence={false} />)

    // Docked panels are gone; the toolbar shows the toggles.
    expect(q('[data-onboarding-target="toolbox"]')).toBeNull()
    const leftToggle = q('[aria-label="Open components and layers"]') as HTMLElement
    const rightToggle = q('[aria-label="Open inspector"]') as HTMLElement
    expect(leftToggle).not.toBeNull()
    expect(rightToggle).not.toBeNull()
    expect(q('[role="dialog"]')).toBeNull()

    // Open the left drawer → toolbox appears inside an aria-modal dialog.
    await act(async () => leftToggle.click())
    const dialog = q('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog!.getAttribute('aria-modal')).toBe('true')
    expect(q('[data-onboarding-target="toolbox"]')).not.toBeNull()
  })
})
