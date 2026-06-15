// Phase 26 — template-variable substitution in the headless renderer (node
// environment, no DOM). Verifies renderDocumentToHtml substitutes `{{ tokens }}`
// in text props, escapes values as text, and honors onMissing.
import { beforeAll, describe, expect, it } from 'vitest'
import { buildDocument } from './build'
import { renderDocumentToHtml } from './render'

beforeAll(async () => {
  await import('@/registry/components')
  await import('@/themes')
  await import('@/adapters/html')
})

const doc = () =>
  buildDocument({
    root: {
      canonical: 'box',
      children: [
        { canonical: 'heading', nodeProps: { content: 'Hi {{ contact.name }}' } },
        { canonical: 'button', nodeProps: { label: '{{ cta }}' } },
      ],
    },
    adapterId: 'html',
  })

describe('renderDocumentToHtml — template variables', () => {
  it('substitutes real values (dot-path, flat or nested)', () => {
    const html = renderDocumentToHtml(doc(), {
      variables: { contact: { name: 'Jane' }, cta: 'Buy now' },
    })
    expect(html).toContain('Hi Jane')
    expect(html).toContain('Buy now')
    expect(html).not.toContain('{{')
  })

  it('keeps the raw token for a missing value by default', () => {
    const html = renderDocumentToHtml(doc(), { variables: { cta: 'Go' } })
    expect(html).toContain('Hi {{ contact.name }}')
    expect(html).toContain('Go')
  })

  it('blanks a missing value when onMissingVariable=blank', () => {
    const html = renderDocumentToHtml(doc(), {
      variables: { cta: 'Go' },
      onMissingVariable: 'blank',
    })
    expect(html).toContain('Hi ')
    expect(html).not.toContain('{{ contact.name }}')
  })

  it('renders a value as escaped text, never HTML (no XSS)', () => {
    const html = renderDocumentToHtml(doc(), {
      variables: { 'contact.name': '<script>x</script>', cta: 'ok' },
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('with no variables option, leaves tokens raw (back-compat)', () => {
    const html = renderDocumentToHtml(doc())
    expect(html).toContain('Hi {{ contact.name }}')
    expect(html).toContain('{{ cta }}')
  })
})
