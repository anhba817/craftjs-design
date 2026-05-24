import { describe, expect, it } from 'vitest'
import { exportDocument } from './exportDocument'
import { ImportError, importDocumentFromFile, parseDocumentJson } from './importDocument'
import type { EditorDocument } from './schema'

const SAMPLE: EditorDocument = {
  version: 1,
  adapterId: 'shadcn',
  themeId: 'rose',
  craftJson: JSON.stringify({
    ROOT: { displayName: 'Box', props: {} },
  }),
}

describe('parseDocumentJson', () => {
  it('round-trips a fresh-exported document unchanged', async () => {
    const blob = exportDocument(SAMPLE)
    const text = await blob.text()
    const parsed = parseDocumentJson(text)
    expect(parsed).toEqual(SAMPLE)
  })

  it('throws ImportError("isn\'t valid JSON") on malformed input', () => {
    expect(() => parseDocumentJson('{not valid json')).toThrowError(ImportError)
    try {
      parseDocumentJson('{not valid json')
    } catch (err) {
      expect((err as ImportError).message).toMatch(/isn't valid JSON/)
    }
  })

  it('throws ImportError("doesn\'t match") on schema mismatch', () => {
    expect(() => parseDocumentJson('{"version": 99}')).toThrowError(ImportError)
    try {
      parseDocumentJson('{"version": 99}')
    } catch (err) {
      expect((err as ImportError).message).toMatch(/envelope shape/)
    }
  })

  it('runs the imported envelope through migrateDocument', () => {
    // Phase-5 Card prop set — stripped by migrateDocument.
    const oldCardTree = {
      'node-card': {
        displayName: 'Card',
        isCanvas: true,
        props: {
          nodeProps: {
            title: 'Stale title',
            description: 'Stale description',
            showFooter: true,
            footerText: 'Stale footer',
          },
        },
      },
    }
    const envelope: EditorDocument = {
      version: 1,
      adapterId: 'shadcn',
      craftJson: JSON.stringify(oldCardTree),
    }
    const parsed = parseDocumentJson(JSON.stringify(envelope))
    const tree = JSON.parse(parsed.craftJson)
    // Migration stripped the stale props and flipped isCanvas.
    expect(tree['node-card'].props.nodeProps).toEqual({})
    expect(tree['node-card'].isCanvas).toBe(false)
  })
})

describe('importDocumentFromFile', () => {
  it('reads from a File and parses the contents', async () => {
    const blob = exportDocument(SAMPLE)
    const text = await blob.text()
    const file = new File([text], 'sample.craftjs-design.json', {
      type: 'application/json',
    })
    const result = await importDocumentFromFile(file)
    expect(result).toEqual(SAMPLE)
  })
})
