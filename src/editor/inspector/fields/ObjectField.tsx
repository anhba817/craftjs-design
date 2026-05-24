import { z } from 'zod'
import { PropField } from './PropField'

// Recursive renderer for nested z.object(...) schemas. Used when an array
// element is an object (Select/Radio/Tabs options) or when a canonical has a
// nested object prop. Renders each sub-field as a labeled row with the same
// dispatch logic as the top-level PropsPanel.
export function ObjectField({
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

  return (
    <div className="space-y-1.5 rounded border-l-2 border-gray-200 bg-gray-50/50 py-1 pl-2">
      {Object.entries(shape).map(([key, fieldSchema]) => (
        <div key={key} className="flex items-center gap-2">
          <label className="min-w-0 flex-shrink-0 text-[11px] text-gray-500">
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
