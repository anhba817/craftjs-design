import { memo } from 'react'
import { z } from 'zod'
import { PropField } from './PropField'

// Stable-id convention: fields named `id` declared as `z.string().default(...)`
// are slot keys seeded once per item (Tabs / Carousel) and must never be
// edited — doing so orphans the dropped canvas content. We discriminate
// by key name + ZodDefault rather than by inspecting the default value:
// Zod v4 wraps `_def.defaultValue` in a getter that resolves the
// (possibly random) function call on every access, so the v3-era
// `typeof defaultValue === 'function'` check is permanently false.
function isInternalIdField(key: string, schema: z.ZodType): boolean {
  return key === 'id' && schema instanceof z.ZodDefault
}

// Recursive renderer for nested z.object(...) schemas. Used when an array
// element is an object (Select/Radio/Tabs options) or when a canonical has a
// nested object prop. Renders each sub-field as a labeled row with the same
// dispatch logic as the top-level PropsPanel.
function ObjectFieldImpl({
  schema,
  value,
  onChange,
}: {
  schema: z.ZodObject<z.ZodRawShape>
  value: Record<string, unknown> | undefined
  onChange: (v: Record<string, unknown>) => void
}) {
  const shape = schema.shape
  const current = value ?? {}

  const setKey = (key: string, newValue: unknown) => {
    onChange({ ...current, [key]: newValue })
  }

  const visibleEntries = Object.entries(shape).filter(
    ([key, s]) => !isInternalIdField(key, s as z.ZodType),
  )

  // Slot-only items (e.g. Carousel's `slides: [{ id }]`) have no
  // editable fields once `id` is filtered out. Render nothing so the
  // ArrayField item card stays tight — the row still has its
  // grip / move / delete affordances from ArrayField itself.
  if (visibleEntries.length === 0) return null

  return (
    <div className="space-y-1.5 rounded border-l-2 border-ed-border bg-ed-surface-2/50 py-1 pl-2">
      {visibleEntries.map(([key, fieldSchema]) => (
        <div key={key} className="flex items-center gap-2">
          <label className="min-w-0 flex-shrink-0 text-[11px] text-ed-text-muted">
            {key}
          </label>
          <div className="min-w-0 flex-1">
            <PropField
              schema={fieldSchema as z.ZodType}
              value={current[key]}
              onChange={(v) => setKey(key, v)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// Phase 17 § 8.5 — memoized so an untouched object field skips re-render
// when a sibling prop changes (stable `onChange` from the parent + unchanged
// `value`).
export const ObjectField = memo(ObjectFieldImpl)
