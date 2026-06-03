import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react'
import { memo, useState } from 'react'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { defaultValueFor } from './defaults'
import { PropField } from './PropField'
import { removeAt, reorder, setAt, swap } from './arrayOps'

// Editor for z.array(...) prop fields. Renders each item as a card with a
// drag handle (GripVertical), ↑/↓ buttons (keyboard accessibility fallback),
// a 🗑 delete button, and a recursive PropField for the element schema.
//
// Phase 7 — drag-and-drop reorder via native HTML5 DnD. The card is the
// draggable element; the GripVertical handle is the visual affordance.
// The midpoint of each item card is the drop split — drop on the upper
// half inserts before, lower half inserts after.
//
// Nested arrays (z.array(z.array(...))) render an unsupported-nesting badge —
// the recursion would work but the resulting UI is unreadable.
function ArrayFieldImpl({
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

  // DnD UI state. Both indices are nullable; null = not currently dragging /
  // not hovering. The drop position records whether the next drop on the
  // current target lands before or after that target.
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before')

  if (element instanceof z.ZodArray) {
    return (
      <span className="text-xs text-ed-danger">
        unsupported deep nesting (z.array of z.array)
      </span>
    )
  }

  const items = value ?? []

  const setItem = (index: number, newItem: unknown) => {
    onChange(setAt(items, index, newItem))
  }

  const remove = (index: number) => {
    onChange(removeAt(items, index))
  }

  // Adjacent-step move for the ↑/↓ buttons.
  const stepMove = (index: number, direction: -1 | 1) => {
    onChange(swap(items, index, index + direction))
  }

  const add = () => {
    const seed = defaultValueFor(element)
    if (seed === null) return
    onChange([...items, seed])
  }

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index)
    // Bare minimum payload — some browsers require dataTransfer to actually
    // start a drag. Real index comes from React state above.
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    // preventDefault is required for the element to accept a drop.
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex === null || draggedIndex === index) return

    // Insertion split — upper half inserts before, lower half after.
    const rect = e.currentTarget.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const next: 'before' | 'after' = e.clientY < midpoint ? 'before' : 'after'
    if (dragOverIndex !== index) setDragOverIndex(index)
    if (dropPosition !== next) setDropPosition(next)
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null) return
    let insertAt = targetIndex + (dropPosition === 'after' ? 1 : 0)
    // After splicing-out the dragged item, the target's effective index
    // shifts. Compensate: if we removed an item BEFORE the insertion point,
    // the insertion point shifts left by one.
    if (draggedIndex < insertAt) insertAt -= 1
    onChange(reorder(items, draggedIndex, insertAt))
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const onDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const renderItem = (item: unknown, index: number) => {
    const isDragging = draggedIndex === index
    const isDropTarget = dragOverIndex === index && draggedIndex !== index
    return (
      <div
        key={index}
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDrop={(e) => onDrop(e, index)}
        onDragEnd={onDragEnd}
        className={cn(
          'space-y-1 rounded border border-ed-border bg-ed-surface p-1.5 transition-colors',
          isDragging && 'opacity-40',
          isDropTarget &&
            dropPosition === 'before' &&
            'border-t-2 border-t-ed-accent',
          isDropTarget &&
            dropPosition === 'after' &&
            'border-b-2 border-b-ed-accent',
        )}
      >
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-ed-text-faint">
          <GripVertical
            size={12}
            className="cursor-grab text-ed-text-faint active:cursor-grabbing"
            aria-hidden
          />
          <span>Item {index + 1}</span>
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => stepMove(index, -1)}
              disabled={index === 0}
              className="rounded p-0.5 hover:bg-ed-surface-3 disabled:opacity-30"
              aria-label="Move up"
            >
              <ChevronUp size={12} />
            </button>
            <button
              type="button"
              onClick={() => stepMove(index, 1)}
              disabled={index === items.length - 1}
              className="rounded p-0.5 hover:bg-ed-surface-3 disabled:opacity-30"
              aria-label="Move down"
            >
              <ChevronDown size={12} />
            </button>
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded p-0.5 text-ed-danger hover:bg-ed-danger/10"
              aria-label="Remove"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        {/* Stop drag start when the user clicks inside the recursive editor —
            otherwise dragging a text selection inside an input would bubble
            up and start moving the whole card. */}
        <div
          onDragStart={(e) => e.stopPropagation()}
          draggable={false}
        >
          <PropField
            schema={element}
            value={item}
            onChange={(v) => setItem(index, v)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {items.length === 0 && (
        <div className="text-[11px] text-ed-text-faint">No items.</div>
      )}
      {items.map(renderItem)}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-ed-border-2 px-2 py-1 text-xs text-ed-text-muted hover:border-ed-border-strong hover:bg-ed-surface-2"
      >
        <Plus size={12} /> Add item
      </button>
    </div>
  )
}

// Phase 17 § 8.5 — memoized so an untouched array field skips re-render
// (and the per-item schema re-walk) when a sibling prop changes.
export const ArrayField = memo(ArrayFieldImpl)
