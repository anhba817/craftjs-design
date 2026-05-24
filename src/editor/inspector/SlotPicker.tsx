import { cn } from '@/lib/utils'

// Mounted by Inspector for Pattern B canonicals (canonicals with more than one
// styleSlot). Picks which slot's classes the panels below will read/write.
//
// Slot state is component-local in Inspector (resets when the selected node
// changes); not stored in editorStore because it's per-selection, not per-app.
export function SlotPicker({
  slots,
  active,
  onChange,
}: {
  slots: readonly string[]
  active: string
  onChange: (s: string) => void
}) {
  return (
    <div className="space-y-1 border-b border-gray-200 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">Slot</div>
      <div className="flex flex-wrap gap-1">
        {slots.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={cn(
              'rounded px-2 py-1 text-xs tracking-wide transition-colors',
              active === s
                ? 'bg-secondary text-secondary-foreground'
                : 'text-gray-600 hover:bg-muted',
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
