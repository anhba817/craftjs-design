import { describe, expect, it } from 'vitest'
import {
  craftJsonFromFileContents,
  generateDocumentSafelist,
} from './safelistPlugin'

describe('craftJsonFromFileContents', () => {
  it('pulls craftJson out of an EditorDocument envelope', () => {
    const env = JSON.stringify({
      version: 1,
      adapterId: 'shadcn',
      craftJson: '{"ROOT":{}}',
    })
    expect(craftJsonFromFileContents(env)).toBe('{"ROOT":{}}')
  })
  it('returns a raw craft-tree JSON string as-is', () => {
    const tree = '{"ROOT":{"props":{}}}'
    expect(craftJsonFromFileContents(tree)).toBe(tree)
  })
  it('returns "" for unparseable input', () => {
    expect(craftJsonFromFileContents('not json at all')).toBe('')
  })
})

describe('generateDocumentSafelist', () => {
  const treeWith = (inline: Record<string, string>, md?: Record<string, string>) =>
    JSON.stringify({
      ROOT: {
        props: {
          style: {
            inline: { root: inline },
            ...(md ? { responsiveInline: { md: { root: md } } } : {}),
          },
        },
      },
    })

  it('emits @source inline directives for arbitrary inline values', () => {
    const css = generateDocumentSafelist([
      treeWith({ backgroundColor: '#ff0000', padding: '13px' }, { color: '#00ff00' }),
    ])
    expect(css).toContain('@source inline("bg-[#ff0000]");')
    expect(css).toContain('@source inline("p-[13px]");')
    expect(css).toContain('@source inline("md:text-[#00ff00]");')
  })

  it('dedupes the same class across multiple documents', () => {
    const a = treeWith({ backgroundColor: '#ff0000' })
    const b = treeWith({ backgroundColor: '#ff0000' })
    const css = generateDocumentSafelist([a, b])
    const occurrences = css.split('@source inline("bg-[#ff0000]");').length - 1
    expect(occurrences).toBe(1)
  })

  it('reports nothing for documents with no arbitrary values', () => {
    const css = generateDocumentSafelist(['{"ROOT":{"props":{}}}'])
    expect(css).toContain('No arbitrary classes detected')
  })
})
