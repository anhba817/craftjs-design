import { describe, expect, it } from 'vitest'
import { exportDocument } from './exportDocument'
import type { EditorDocument } from './schema'

const SAMPLE: EditorDocument = {
  version: 1,
  adapterId: 'shadcn',
  themeId: 'rose',
  craftJson: JSON.stringify({
    ROOT: { displayName: 'Box', props: {} },
  }),
}

describe('exportDocument', () => {
  it('returns a Blob with application/json mime type', () => {
    const blob = exportDocument(SAMPLE)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/json')
  })

  it('Blob contents round-trip through JSON.parse', async () => {
    const blob = exportDocument(SAMPLE)
    const text = await blob.text()
    const parsed = JSON.parse(text)
    expect(parsed).toEqual(SAMPLE)
  })

  it('rejects envelopes that violate the schema', () => {
    const bad = { version: 99 } as unknown as EditorDocument
    expect(() => exportDocument(bad)).toThrow()
  })
})
