import { memo } from 'react'
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
//
// Phase 17 § 8.5 — memoized. The dispatch re-walks the Zod schema on every
// render; with stable `onChange` identities (PropsPanel hands each field a
// memoized handler) and an unchanged `value`, an untouched field skips the
// re-walk + re-render entirely. Editing one field no longer re-renders its
// siblings or their nested Array/Object sub-forms.
function PropFieldImpl({
  schema,
  value,
  onChange,
}: {
  schema: z.ZodType
  value: unknown
  onChange: (v: unknown) => void
}) {
  // Unwrap ZodDefault / ZodOptional so wrappers around a known kind don't
  // fall through to the "unsupported" branch. `defaults.ts` already does
  // the symmetric unwrap when seeding "+ Add" values; without this path
  // here, Tabs's `id: z.string().default(...)` and Carousel's similar
  // slide id would render an "unsupported Zod kind (ZodDefault)" badge.
  if (schema instanceof z.ZodDefault) {
    const inner = (schema as unknown as { _def: { innerType: z.ZodType } })
      ._def.innerType
    return <PropField schema={inner} value={value} onChange={onChange} />
  }
  if (schema instanceof z.ZodOptional) {
    const inner = (schema as unknown as { _def: { innerType: z.ZodType } })
      ._def.innerType
    return <PropField schema={inner} value={value} onChange={onChange} />
  }
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
        className="w-full rounded border border-ed-border-2 bg-ed-surface px-1.5 py-1 text-sm text-ed-text"
      />
    )
  }
  if (schema instanceof z.ZodBoolean) {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-ed-border-2"
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
        className="w-full rounded border border-ed-border-2 bg-ed-surface px-1.5 py-1 text-sm text-ed-text"
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
    <span className="text-xs text-ed-danger">
      unsupported Zod kind ({schema.constructor.name})
    </span>
  )
}

export const PropField = memo(PropFieldImpl)
