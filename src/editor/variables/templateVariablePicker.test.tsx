// @vitest-environment jsdom
//
// Phase 26 Group C — the inspector's `{{ }}` variable picker. Mounts the real
// PropField (string field) wrapped in EditorTemplateVariablesProvider and
// verifies the picker appears only when variables are declared, and that
// selecting one inserts `{{ key }}` into the value at the caret.
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { PropField } from '../inspector/fields/PropField'
import { EditorTemplateVariablesProvider } from './EditorTemplateVariablesProvider'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const VARS = [{ key: 'contact.name', label: 'Full name', group: 'Contact', sample: 'Jane' }]
const MANY = [
  { key: 'contact.name', label: 'Full name', group: 'Contact' },
  { key: 'contact.title', label: 'Job title', group: 'Contact' },
  { key: 'company.name', label: 'Company', group: 'Company' },
]

// React controlled inputs ignore a plain `.value =`; use the native setter +
// an input event so onChange fires.
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

const pickerBtn = () =>
  document.querySelector('[aria-label="Insert template variable"]') as HTMLElement | null
const rowFor = (key: string) =>
  [...document.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(`{{ ${key} }}`),
  ) ?? null

describe('template variable picker (inspector)', () => {
  it('is hidden when the host declared no variables', () => {
    const onChange = vi.fn()
    mount(<PropField schema={z.string()} value="x" onChange={onChange} />)
    expect(pickerBtn()).toBeNull()
    expect(container.querySelector('input[type="text"]')).not.toBeNull()
  })

  it('lists declared variables and inserts the token at the caret', async () => {
    const onChange = vi.fn()
    mount(
      <EditorTemplateVariablesProvider variables={VARS}>
        <PropField schema={z.string()} value="Hi " onChange={onChange} />
      </EditorTemplateVariablesProvider>,
    )
    const btn = pickerBtn()
    expect(btn).not.toBeNull()

    await act(async () => {
      btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 30))
    })
    const row = rowFor('contact.name')
    expect(row).not.toBeNull()

    await act(async () => {
      row!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    // Caret defaulted to end of "Hi " → token appended.
    expect(onChange).toHaveBeenCalledWith('Hi {{ contact.name }}')
  })

  it('filters the list by search and Enter picks the first match', async () => {
    const onChange = vi.fn()
    mount(
      <EditorTemplateVariablesProvider variables={MANY}>
        <PropField schema={z.string()} value="" onChange={onChange} />
      </EditorTemplateVariablesProvider>,
    )
    await act(async () => {
      pickerBtn()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 30))
    })
    // All three before filtering.
    expect(rowFor('contact.name')).not.toBeNull()
    expect(rowFor('company.name')).not.toBeNull()

    const search = document.querySelector(
      '[aria-label="Search variables"]',
    ) as HTMLInputElement
    expect(search).not.toBeNull()
    await act(async () => typeInto(search, 'company'))

    // Only the matching variable remains.
    expect(rowFor('company.name')).not.toBeNull()
    expect(rowFor('contact.name')).toBeNull()
    expect(rowFor('contact.title')).toBeNull()

    // Enter inserts the first (only) match.
    await act(async () => {
      search.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      )
    })
    expect(onChange).toHaveBeenCalledWith('{{ company.name }}')
  })
})
