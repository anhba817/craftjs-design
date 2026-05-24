import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { defaultValueFor } from './defaults'
import { PropField } from './PropField'

// Editor for z.array(...) prop fields. Renders each item as a card with
// reorder + delete controls and a recursive PropField for the element schema.
// The "Add" button appends an item seeded by defaultValueFor.
//
// Nested arrays (z.array(z.array(...))) render an unsupported-nesting badge —
// the recursion would work but the resulting UI is unreadable. Phase 7 polish
// item if a real canonical needs it.
export function ArrayField({
  schema,
  value,
  onChange,
}: {
  // Zod v4's parameterized array type uses internal $ZodType that doesn't
  // line up with the public ZodType. Loosen to satisfy the type checker —
  // runtime behavior is unchanged and we cast `element` to z.ZodType below.
  schema: z.ZodArray<z.ZodType<unknown>>
  value: unknown[] | undefined
  onChange: (v: unknown[]) => void
}) {
  const element = schema.element as z.ZodType

  if (element instanceof z.ZodArray) {
    return (
      <span className="text-xs text-destructive">
        unsupported deep nesting (z.array of z.array)
      </span>
    )
  }

  const items = value ?? []

  const setItem = (index: number, newItem: unknown) => {
    const next = items.slice()
    next[index] = newItem
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = items.slice()
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const add = () => {
    const seed = defaultValueFor(element)
    if (seed === null) return
    onChange([...items, seed])
  }

  return (
    <div className="space-y-1.5">
      {items.length === 0 && (
        <div className="text-[11px] text-gray-400">No items.</div>
      )}
      {items.map((item, index) => (
        <div
          key={index}
          className="space-y-1 rounded border border-gray-200 bg-white p-1.5"
        >
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-400">
            <span>Item {index + 1}</span>
            <div className="ml-auto flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                className="rounded p-0.5 text-destructive hover:bg-destructive/10"
                aria-label="Remove"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <PropField
            schema={element}
            value={item}
            onChange={(v) => setItem(index, v)}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-600 hover:border-gray-400 hover:bg-gray-50"
      >
        <Plus size={12} /> Add item
      </button>
    </div>
  )
}
