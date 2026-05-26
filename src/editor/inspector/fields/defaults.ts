import { z } from 'zod'

// Produces a sensible default value for a Zod schema. Used by ArrayField's
// "Add" button to seed a new item — the user can then edit it via the recursive
// PropField renderer.
//
// Returns `null` for kinds we don't know how to default. Callers (specifically
// the "Add" button) should skip insertion in that case rather than poisoning
// the array with nulls.
//
// Phase 10 § 2.11 — ZodDefault handling. Schemas like
// `z.string().default(() => `tab-${random}`)` (the Tabs `id` field)
// rely on this path to seed a fresh id on each "+ Add". Without the
// ZodDefault check, the wrapper would fall through to `null` and the
// caller would skip insertion, breaking the Add button.
export function defaultValueFor(schema: z.ZodType): unknown {
  if (schema instanceof z.ZodDefault) {
    // Zod stores the default as a function or a value on `_def.defaultValue`.
    // The function form is how we get a fresh id per call.
    const def = (
      schema as unknown as { _def: { defaultValue: unknown } }
    )._def.defaultValue
    return typeof def === 'function' ? (def as () => unknown)() : def
  }
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    // Recurse into the inner type so an `id?` doesn't fall through to null.
    const inner = (schema as unknown as { _def: { innerType: z.ZodType } })
      ._def.innerType
    return defaultValueFor(inner)
  }
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
