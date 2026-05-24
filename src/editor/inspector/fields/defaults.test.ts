import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { defaultValueFor } from './defaults'

describe('defaultValueFor', () => {
  it('strings default to empty string', () => {
    expect(defaultValueFor(z.string())).toBe('')
  })

  it('numbers default to 0', () => {
    expect(defaultValueFor(z.number())).toBe(0)
  })

  it('booleans default to false', () => {
    expect(defaultValueFor(z.boolean())).toBe(false)
  })

  it('enums default to the first option', () => {
    expect(defaultValueFor(z.enum(['a', 'b', 'c']))).toBe('a')
  })

  it('arrays default to empty', () => {
    expect(defaultValueFor(z.array(z.string()))).toEqual([])
  })

  it('objects default to a shape with each field defaulted recursively', () => {
    const schema = z.object({
      label: z.string(),
      count: z.number(),
      active: z.boolean(),
      direction: z.enum(['up', 'down']),
    })
    expect(defaultValueFor(schema)).toEqual({
      label: '',
      count: 0,
      active: false,
      direction: 'up',
    })
  })

  it('nested objects recurse', () => {
    const schema = z.object({
      outer: z.object({ inner: z.string() }),
    })
    expect(defaultValueFor(schema)).toEqual({ outer: { inner: '' } })
  })

  it('object element of an array seeds a new item shape', () => {
    const optionSchema = z.object({ value: z.string(), label: z.string() })
    expect(defaultValueFor(optionSchema)).toEqual({ value: '', label: '' })
  })

  it('unknown kinds return null', () => {
    expect(defaultValueFor(z.unknown())).toBeNull()
  })
})
