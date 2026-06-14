// @vitest-environment jsdom
//
// Phase 25 Group A — layout primitives: useEditorViewport, the editorStore
// panel slice, and the ChromeDrawer shell (docked ≥lg, overlay drawer below).
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '@/state/editorStore'
import { useEditorViewport } from './useEditorViewport'
import { ChromeDrawer } from './ChromeDrawer'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// ── controllable matchMedia mock ────────────────────────────────────────────
function installMatchMedia(initialWidth: number) {
  let width = initialWidth
  const buckets = new Map<string, Set<() => void>>()
  const minOf = (q: string) => Number(/min-width:\s*(\d+)/.exec(q)?.[1] ?? 0)
  window.matchMedia = ((query: string) => {
    const listeners = buckets.get(query) ?? new Set<() => void>()
    buckets.set(query, listeners)
    return {
      get matches() {
        return width >= minOf(query)
      },
      media: query,
      onchange: null,
      addEventListener: (_t: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_t: string, cb: () => void) => listeners.delete(cb),
      addListener: (cb: () => void) => listeners.add(cb),
      removeListener: (cb: () => void) => listeners.delete(cb),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList
  }) as typeof window.matchMedia
  return {
    resize(w: number) {
      width = w
      buckets.forEach((set) => set.forEach((cb) => cb()))
    },
  }
}

let container: HTMLDivElement
let root: Root | null = null
const mount = (node: React.ReactElement) =>
  act(() => {
    root = createRoot(container)
    root.render(node)
  })

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  useEditorStore.getState().closeAllPanels()
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  container?.remove()
})

describe('useEditorViewport', () => {
  function Probe() {
    const { isDesktop, isCondensed } = useEditorViewport()
    return <span data-testid="vp">{`${isDesktop ? 'desktop' : 'narrow'}/${isCondensed ? 'condensed' : 'full'}`}</span>
  }
  const vp = () => container.querySelector('[data-testid="vp"]')!.textContent

  it('reflects width and reacts to matchMedia changes (panels=lg, toolbar=xl)', () => {
    const mm = installMatchMedia(1440)
    mount(<Probe />)
    expect(vp()).toBe('desktop/full') // ≥ xl: docked + inline toolbar
    // Phone.
    act(() => mm.resize(500))
    expect(vp()).toBe('narrow/condensed')
    // Decoupled middle (lg ≤ w < xl): panels docked, toolbar condensed.
    act(() => mm.resize(1100))
    expect(vp()).toBe('desktop/condensed')
  })
})

describe('editorStore panel slice', () => {
  it('toggles each panel and closeAllPanels resets both', () => {
    const s = useEditorStore.getState()
    s.setLeftPanelOpen(true)
    s.setRightPanelOpen(true)
    expect(useEditorStore.getState().leftPanelOpen).toBe(true)
    expect(useEditorStore.getState().rightPanelOpen).toBe(true)
    useEditorStore.getState().closeAllPanels()
    expect(useEditorStore.getState().leftPanelOpen).toBe(false)
    expect(useEditorStore.getState().rightPanelOpen).toBe(false)
  })
})

describe('ChromeDrawer', () => {
  it('≥ lg renders children docked — no dialog overlay', () => {
    installMatchMedia(1440)
    mount(
      <ChromeDrawer side="left" open={false} onClose={() => {}} label="Left">
        <button data-testid="docked">x</button>
      </ChromeDrawer>,
    )
    expect(container.querySelector('[data-testid="docked"]')).not.toBeNull()
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('below lg + open renders an aria-modal dialog; Esc and backdrop close it', () => {
    installMatchMedia(500)
    const onClose = vi.fn()
    mount(
      <ChromeDrawer side="left" open onClose={onClose} label="Components">
        <button data-testid="inside">x</button>
      </ChromeDrawer>,
    )
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog!.getAttribute('aria-modal')).toBe('true')
    expect(dialog!.getAttribute('aria-label')).toBe('Components')

    // Esc closes.
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })
    expect(onClose).toHaveBeenCalledTimes(1)

    // Backdrop click closes.
    const backdrop = container.querySelector('[aria-hidden]') as HTMLElement
    act(() => backdrop.click())
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('below lg + closed renders nothing', () => {
    installMatchMedia(500)
    mount(
      <ChromeDrawer side="right" open={false} onClose={() => {}} label="Inspector">
        <button>x</button>
      </ChromeDrawer>,
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})
