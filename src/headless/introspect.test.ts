import { beforeAll, describe, expect, it } from 'vitest'
import { describeCanonical, describeCanonicals } from './introspect'

beforeAll(async () => {
  await import('@/registry/components')
})

describe('describeCanonicals', () => {
  it('describes every registered canonical with a JSON Schema for its props', () => {
    const all = describeCanonicals()
    expect(all.length).toBeGreaterThanOrEqual(48)
    for (const d of all) {
      // Every canonical's zod schema must convert — an unconvertible schema
      // would leave the MCP tool inputs untyped for that component.
      expect(d.propsJsonSchema, `${d.id} has no JSON schema`).toBeDefined()
      expect(d.styleSlots.length).toBeGreaterThan(0)
      expect(d.applicablePanels.length).toBeGreaterThan(0)
    }
  })

  it('classifies Pattern B canonicals', () => {
    const card = describeCanonical('card')!
    expect(card.canvasSlots).toEqual(['header', 'body', 'footer'])
    const tabs = describeCanonical('tabs')!
    expect(tabs.canvasSlots).toBe('dynamic')
    const table = describeCanonical('table')!
    expect(table.slotComponent).toBe('table-cell')
    const cell = describeCanonical('table-cell')!
    expect(cell.hidden).toBe(true)
  })

  it('the JSON schema carries real constraints', () => {
    const heading = describeCanonical('heading')!
    const schema = heading.propsJsonSchema as {
      properties: Record<string, { enum?: string[] }>
    }
    expect(schema.properties.level.enum).toBeDefined()
  })

  it('returns null for unknown ids', () => {
    expect(describeCanonical('nope')).toBeNull()
  })
})
