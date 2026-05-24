import { describe, expect, it } from 'vitest'
import {
  extractArbitraryClasses,
  extractArbitraryClassesFromCraftJson,
  formatAsSafelistCss,
} from './safelist-extract'

describe('extractArbitraryClasses', () => {
  it('returns empty for a tree with no inline values', () => {
    const tree = {
      ROOT: { props: { style: { classes: { root: 'p-4 bg-card' } } } },
    }
    expect(extractArbitraryClasses(tree)).toEqual([])
  })

  it('extracts base inline values as Tailwind arbitrary classes', () => {
    const tree = {
      ROOT: {
        props: {
          style: {
            classes: { root: '' },
            inline: {
              root: { backgroundColor: '#ff0000', padding: '13px' },
            },
          },
        },
      },
    }
    expect(extractArbitraryClasses(tree)).toEqual([
      'bg-[#ff0000]',
      'p-[13px]',
    ])
  })

  it('prefixes responsiveInline values with the breakpoint', () => {
    const tree = {
      ROOT: {
        props: {
          style: {
            classes: { root: '' },
            responsiveInline: {
              md: { root: { backgroundColor: '#00ff00' } },
              lg: { root: { color: '#ffffff' } },
            },
          },
        },
      },
    }
    expect(extractArbitraryClasses(tree)).toEqual([
      'lg:text-[#ffffff]',
      'md:bg-[#00ff00]',
    ])
  })

  it('walks every node in the tree, deduplicating across them', () => {
    const tree = {
      a: { props: { style: { inline: { root: { color: '#fff' } } } } },
      b: { props: { style: { inline: { root: { color: '#fff' } } } } },
      c: { props: { style: { inline: { root: { color: '#000' } } } } },
    }
    expect(extractArbitraryClasses(tree)).toEqual([
      'text-[#000]',
      'text-[#fff]',
    ])
  })

  it('skips CSS properties without a clean Tailwind mapping', () => {
    const tree = {
      ROOT: {
        props: {
          style: {
            inline: {
              root: {
                backgroundColor: '#ff0000', // maps → kept
                fontVariant: 'small-caps', // no map → skipped
              },
            },
          },
        },
      },
    }
    expect(extractArbitraryClasses(tree)).toEqual(['bg-[#ff0000]'])
  })

  it('skips nodes that have no style', () => {
    const tree = {
      ROOT: {},
      child: { props: { style: { inline: { root: { color: '#000' } } } } },
    }
    expect(extractArbitraryClasses(tree)).toEqual(['text-[#000]'])
  })

  it('replaces whitespace inside values with underscores', () => {
    // Tailwind requires single-word arbitrary values; embedded spaces fail
    // to parse. We're conservative and replace any whitespace with `_`.
    const tree = {
      ROOT: {
        props: {
          style: {
            inline: { root: { borderColor: 'rgb(255 0 0)' } },
          },
        },
      },
    }
    expect(extractArbitraryClasses(tree)).toEqual(['border-[rgb(255_0_0)]'])
  })

  it('handles multiple slots per node', () => {
    const tree = {
      ROOT: {
        props: {
          style: {
            inline: {
              root: { backgroundColor: '#ff0000' },
              header: { padding: '24px' },
            },
          },
        },
      },
    }
    expect(extractArbitraryClasses(tree)).toEqual([
      'bg-[#ff0000]',
      'p-[24px]',
    ])
  })
})

describe('extractArbitraryClassesFromCraftJson', () => {
  it('parses and extracts from a JSON string', () => {
    const json = JSON.stringify({
      ROOT: {
        props: {
          style: { inline: { root: { backgroundColor: '#abc' } } },
        },
      },
    })
    expect(extractArbitraryClassesFromCraftJson(json)).toEqual([
      'bg-[#abc]',
    ])
  })

  it('returns empty array on malformed JSON', () => {
    expect(extractArbitraryClassesFromCraftJson('{not json')).toEqual([])
  })
})

describe('formatAsSafelistCss', () => {
  it('emits one @source inline directive per class', () => {
    const css = formatAsSafelistCss(['bg-[#ff0000]', 'md:p-[13px]'])
    expect(css).toContain('@source inline("bg-[#ff0000]");')
    expect(css).toContain('@source inline("md:p-[13px]");')
  })

  it('emits an explanatory comment for empty input', () => {
    const css = formatAsSafelistCss([])
    expect(css).toMatch(/No arbitrary classes detected/)
  })
})
