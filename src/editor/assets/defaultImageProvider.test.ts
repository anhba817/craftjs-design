import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _resetDefaultImageProviderForTests,
  defaultImageProvider,
} from './EditorImageProvider'
import type { EditorImageProviderValue } from './EditorImageProvider'

// Phase 11 § 3.10 — the default base64 provider + a mock host
// provider contract. The provider logic is plain async functions,
// testable without React. We stub FileReader (node has no DOM).

// Minimal FileReader stub that resolves readAsDataURL to a fake
// data: URL derived from the file's injected `_contents`.
class FakeFileReader {
  result: string | null = null
  error: unknown = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  readAsDataURL(file: { _dataUrl?: string }) {
    // Simulate async read.
    queueMicrotask(() => {
      this.result = file._dataUrl ?? 'data:image/png;base64,AAAA'
      this.onload?.()
    })
  }
}

function makeFile(name: string, size: number, dataUrl?: string): File {
  // We only need .name, .size, and the stub's _dataUrl. Cast through
  // unknown — the real File API isn't available in node.
  return {
    name,
    size,
    _dataUrl: dataUrl,
  } as unknown as File
}

beforeEach(() => {
  vi.stubGlobal('FileReader', FakeFileReader)
  _resetDefaultImageProviderForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  _resetDefaultImageProviderForTests()
})

describe('defaultImageProvider', () => {
  it('canList is false (inline data URLs are not enumerable)', () => {
    expect(defaultImageProvider.canList).toBe(false)
  })

  it('list() is empty before any upload', async () => {
    expect(await defaultImageProvider.list()).toEqual([])
  })

  it('upload() encodes the file to a data URL', async () => {
    const file = makeFile('logo.png', 1234, 'data:image/png;base64,ZZZZ')
    const asset = await defaultImageProvider.upload(file)
    expect(asset.url).toBe('data:image/png;base64,ZZZZ')
  })

  it('list() returns every distinct session upload (not just the latest)', async () => {
    await defaultImageProvider.upload(
      makeFile('a.png', 100, 'data:image/png;base64,AAA'),
    )
    await defaultImageProvider.upload(
      makeFile('b.png', 100, 'data:image/png;base64,BBB'),
    )
    const list = await defaultImageProvider.list()
    expect(list.map((a) => a.url)).toEqual([
      'data:image/png;base64,AAA',
      'data:image/png;base64,BBB',
    ])
  })

  it('list() dedupes identical uploads', async () => {
    const dup = makeFile('same.png', 100, 'data:image/png;base64,DUP')
    await defaultImageProvider.upload(dup)
    await defaultImageProvider.upload(dup)
    expect(await defaultImageProvider.list()).toHaveLength(1)
  })

  it('warns when the file exceeds the inline soft cap (500 KB)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const big = makeFile('big.png', 600 * 1024)
    await defaultImageProvider.upload(big)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain('EditorImageProvider')
  })

  it('does NOT warn for small files', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const small = makeFile('small.png', 10 * 1024)
    await defaultImageProvider.upload(small)
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('host provider contract', () => {
  it('a listing-capable host provider round-trips upload + list + delete', async () => {
    const store = new Map<string, string>()
    const host: EditorImageProviderValue = {
      async upload(file) {
        const url = `https://cdn.example/${file.name}`
        store.set(url, url)
        return { url }
      },
      async list() {
        return [...store.keys()].map((url) => ({ url }))
      },
      async delete(url) {
        store.delete(url)
      },
      canList: true,
    }

    const a = await host.upload(makeFile('a.png', 100))
    const b = await host.upload(makeFile('b.png', 100))
    expect(a.url).toBe('https://cdn.example/a.png')

    const listed = await host.list()
    expect(listed.map((x) => x.url).sort()).toEqual([
      'https://cdn.example/a.png',
      'https://cdn.example/b.png',
    ])

    await host.delete?.(b.url)
    expect((await host.list()).map((x) => x.url)).toEqual([
      'https://cdn.example/a.png',
    ])
  })
})
