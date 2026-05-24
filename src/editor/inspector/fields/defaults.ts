import { z } from 'zod'

// Produces a sensible default value for a Zod schema. Used by ArrayField's
// "Add" button to seed a new item — the user can then edit it via the recursive
// PropField renderer.
//
// Returns `null` for kinds we don't know how to default. Callers (specifically
// the "Add" button) should skip insertion in that case rather than poisoning
// the array with nulls.
export function defaultValueFor(schema: z.ZodType): unknown {
  if (schema instanceof z.ZodString) return ''
  if (schema instanceof z.ZodNumber) return 0
  if (schema instanceof z.ZodBoolean) return false
  if (schema instanceof z.ZodEnum) {
    // ZodEnum.options is a readonly string[] at runtime; Zod v4's generic type
    // signature changed in a way that doesn't cleanly express that, so an
    // explicit cast is cheaper than fighting the generic.
    const options = (schema as unknown as { options: readonly string[] }).options
    return options[0] ?? ''
  }
  if (schema instanceof z.ZodArray) return []
  if (schema instanceof z.ZodObject) {
    const out: Record<string, unknown> = {}
    const shape = (schema as z.ZodObject<z.ZodRawShape>).shape
    for (const [key, fieldSchema] of Object.entries(shape)) {
      out[key] = defaultValueFor(fieldSchema as z.ZodType)
    }
    return out
  }
  return null
}
