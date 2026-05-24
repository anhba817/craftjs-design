import { describe, expect, it } from 'vitest'
import {
  DecodeError,
  SHARE_URL_MAX_PAYLOAD,
  decodeDocument,
  encodeDocument,
  readSharedFragment,
  shareUrlFor,
} from './share'
import type { EditorDocument } from './schema'

function makeEnvelope(overrides: Partial<EditorDocument> = {}): EditorDocument {
  return {
    version: 1,
    adapterId: 'shadcn',
    themeId: 'rose',
    craftJson: JSON.stringify({
      ROOT: { displayName: 'Box', props: {} },
    }),
    ...overrides,
  }
}

describe('encodeDocument / decodeDocument', () => {
  it('round-trips a small envelope unchanged', () => {
    const env = makeEnvelope({ themeId: 'rose' })
    const { encoded } = encodeDocument(env)
    expect(decodeDocument(encoded)).toEqual(env)
  })

  it('encoded length is well under the size limit for typical documents', () => {
    const { byteLength, exceedsLimit } = encodeDocument(makeEnvelope())
    expect(byteLength).toBeLessThan(SHARE_URL_MAX_PAYLOAD)
    expect(exceedsLimit).toBe(false)
  })

  it('exceedsLimit fires when the encoded payload is too large', () => {
    // lz-string compresses repeated content aggressively. Pack truly random
    // content (each char drawn from a fresh entropy source) so compression
    // can't reduce below the limit.
    const tree: Record<string, unknown> = {}
    const randomChars = () => {
      let s = ''
      for (let i = 0; i < 400; i++) {
        // Mix base36 + base16 for higher entropy than either alone.
        s += Math.random().toString(36).slice(2, 12)
        s += Math.random().toString(16).slice(2, 12)
      }
      return s
    }
    for (let i = 0; i < 100; i++) {
      tree[`node-${i}`] = {
        displayName: 'Text',
        props: { nodeProps: { content: randomChars() } },
      }
    }
    const env = makeEnvelope({ craftJson: JSON.stringify(tree) })
    const { exceedsLimit } = encodeDocument(env)
    expect(exceedsLimit).toBe(true)
  })

  it('decodeDocument throws DecodeError on garbage input', () => {
    expect(() => decodeDocument('!not-a-valid-encoded-blob!')).toThrowError(DecodeError)
  })

  it('decodeDocument throws DecodeError on schema-mismatched payload', () => {
    // Encode something that decompresses but isn't an envelope.
    const garbage = encodeDocument(makeEnvelope()).encoded
    // Tamper with the encoded blob — should fail decode or schema parse.
    expect(() => decodeDocument('a' + garbage)).toThrowError(DecodeError)
  })

  it('decodeDocument runs the envelope through migrateDocument', () => {
    const oldShapeTree = {
      'node-card': {
        displayName: 'Card',
        isCanvas: true,
        props: { nodeProps: { title: 'stale' } },
      },
    }
    const env = makeEnvelope({ craftJson: JSON.stringify(oldShapeTree) })
    const { encoded } = encodeDocument(env)
    const decoded = decodeDocument(encoded)
    const tree = JSON.parse(decoded.craftJson)
    expect(tree['node-card'].props.nodeProps).toEqual({})
    expect(tree['node-card'].isCanvas).toBe(false)
  })
})

describe('shareUrlFor', () => {
  it('builds a URL with the encoded document in the fragment', () => {
    const { url, encoded } = shareUrlFor(
      makeEnvelope(),
      'https://example.com/editor',
    )
    expect(url).toBe(`https://example.com/editor#doc=${encoded}`)
  })
})

describe('readSharedFragment', () => {
  it('returns the encoded payload from a #doc=… fragment', () => {
    expect(readSharedFragment('#doc=abc123')).toBe('abc123')
  })

  it('returns the payload even when the leading # is missing', () => {
    expect(readSharedFragment('doc=abc123')).toBe('abc123')
  })

  it('returns null when the fragment is empty', () => {
    expect(readSharedFragment('')).toBeNull()
    expect(readSharedFragment('#')).toBeNull()
  })

  it('returns null when the fragment is present but has no doc= key', () => {
    expect(readSharedFragment('#other=foo')).toBeNull()
  })

  it('ignores trailing fragment params', () => {
    expect(readSharedFragment('#doc=abc&other=foo')).toBe('abc')
  })
})
