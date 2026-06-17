// @vitest-environment jsdom
//
// Phase 27 Group D — the searchable icon picker. Verifies the popover opens,
// search filters the full lucide set, clicking a cell writes the kebab name,
// Enter picks the first match, and the clear (×) writes ''.
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IconPicker } from './IconPicker'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// jsdom lacks the layout APIs @tanstack/react-virtual probes; stub them so the
// virtualizer reports a non-zero viewport and renders rows.
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 320,
  })
  Element.prototype.scrollTo = () => {}
})

function typeInto(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!
  setter.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

let container: HTMLDivElement
let root: Root | null = null
const mount = (ui: React.ReactElement) =>
  act(() => {
    root = createRoot(container)
    root.render(ui)
  })

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  container?.remove()
})

const trigger = () =>
  document.querySelector('[aria-label="Choose icon"]') as HTMLElement | null
const searchInput = () =>
  document.querySelector('[aria-label="Search icons"]') as HTMLInputElement | null
const cellFor = (name: string) =>
  document.querySelector(`button[aria-label="${name}"]`) as HTMLElement | null

async function open() {
  await act(async () => {
    trigger()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 30))
  })
}

describe('IconPicker', () => {
  it('opens, filters by search, and writes the kebab name on click', async () => {
    const onChange = vi.fn()
    await mount(<IconPicker value="star" onChange={onChange} />)
    expect(trigger()).not.toBeNull()
    await open()
    expect(searchInput()).not.toBeNull()

    // Filter to a non-legacy icon the old enum never had.
    await act(async () => typeInto(searchInput()!, 'shopping-cart'))
    const cell = cellFor('shopping-cart')
    expect(cell).not.toBeNull()

    await act(async () => {
      cell!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onChange).toHaveBeenCalledWith('shopping-cart')
  })

  it('Enter picks the first match', async () => {
    const onChange = vi.fn()
    await mount(<IconPicker value="" onChange={onChange} />)
    await open()
    await act(async () => typeInto(searchInput()!, 'shopping-cart'))
    await act(async () => {
      searchInput()!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      )
    })
    expect(onChange).toHaveBeenCalledWith('shopping-cart')
  })

  it('clear (×) writes empty string when a value is set', async () => {
    const onChange = vi.fn()
    await mount(<IconPicker value="star" onChange={onChange} />)
    await open()
    const clear = document.querySelector('[aria-label="No icon"]') as HTMLElement
    expect(clear).not.toBeNull()
    await act(async () => {
      clear.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onChange).toHaveBeenCalledWith('')
  })
})
