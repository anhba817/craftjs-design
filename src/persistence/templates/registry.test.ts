import { afterEach, describe, expect, it } from 'vitest'
import {
  _clearTemplatesForTest,
  getTemplate,
  listTemplates,
  registerTemplate,
} from './registry'

function makeTemplate(id: string) {
  return {
    id,
    name: `Template ${id}`,
    description: 'desc',
    envelope: {
      version: 1 as const,
      adapterId: 'shadcn',
      craftJson: '{}',
    },
  }
}

afterEach(() => {
  _clearTemplatesForTest()
})

describe('template registry', () => {
  it('registerTemplate stores by id; getTemplate retrieves', () => {
    registerTemplate(makeTemplate('t1'))
    expect(getTemplate('t1')?.id).toBe('t1')
  })

  it('listTemplates returns every registered template', () => {
    registerTemplate(makeTemplate('a'))
    registerTemplate(makeTemplate('b'))
    expect(listTemplates().map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('registerTemplate throws on duplicate ids', () => {
    registerTemplate(makeTemplate('dup'))
    expect(() => registerTemplate(makeTemplate('dup'))).toThrow(/duplicate/)
  })

  it('getTemplate returns undefined for unknown ids', () => {
    expect(getTemplate('missing')).toBeUndefined()
  })
})
