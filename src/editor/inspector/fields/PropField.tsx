import { z } from 'zod'
import { ValueSelect } from '../shared/ValueSelect'
import { ArrayField } from './ArrayField'
import { ObjectField } from './ObjectField'

// Recursive dispatcher for one prop field. Used at the top level by
// PropsPanel (one per key in the canonical's propsSchema shape) and also by
// ArrayField / ObjectField when descending into nested element schemas.
//
// Each branch handles one Zod kind. Unsupported kinds render a labeled badge
// so gaps are visible.
export function PropField({
  schema,
  value,
  onChange,
}: {
  schema: z.ZodType
  value: unknown
  onChange: (v: unknown) => void
}) {
  if (schema instanceof z.ZodEnum) {
    return (
      <ValueSelect
        value={(value as string | undefined) ?? ''}
        options={schema.options as readonly string[]}
        onChange={(v) => onChange(v)}
      />
    )
  }
  if (schema instanceof z.ZodString) {
    return (
      <input
        type="text"
        value={(value as string | undefined) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700"
      />
    )
  }
  if (schema instanceof z.ZodBoolean) {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
    )
  }
  if (schema instanceof z.ZodNumber) {
    return (
      <input
        type="number"
        value={(value as number | undefined) ?? ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? undefined : Number(e.target.value))
        }
        className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700"
      />
    )
  }
  if (schema instanceof z.ZodArray) {
    return (
      <ArrayField
        schema={schema as z.ZodArray<z.ZodType<unknown>>}
        value={value as unknown[] | undefined}
        onChange={onChange}
      />
    )
  }
  if (schema instanceof z.ZodObject) {
    return (
      <ObjectField
        schema={schema}
        value={value as Record<string, unknown> | undefined}
        onChange={onChange}
      />
    )
  }
  return (
    <span className="text-xs text-destructive">
      unsupported Zod kind ({schema.constructor.name})
    </span>
  )
}
