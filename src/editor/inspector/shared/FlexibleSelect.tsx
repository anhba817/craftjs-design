import { useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// Phase 12 — a combobox: free-text input + a dropdown of preset
// values. Used by the Transforms / Filters / Transitions panels so a
// designer can pick a common value OR type any CSS value. Unlike
// NumericInput (which validates against a px/%/rem regex), this
// accepts ANY string — transform/filter/transition args are too
// varied to validate (`45deg`, `1.1`, `ease-in-out`, `0 4px 6px …`).
//
// Presentation-only: emits the raw string via onChange; the panel
// writes it into the composed inline CSS value.

interface FlexibleSelectProps {
  value: string
  presets: readonly string[]
  onChange: (next: string) => void
  /** Shown when empty; the panels pass "— Mixed" in multi-select. */
  placeholder?: string
}

export function FlexibleSelect({
  value,
  presets,
  onChange,
  placeholder,
}: FlexibleSelectProps) {
  const [local, setLocal] = useState(value)

  // Keep local state in sync when the prop changes (theme swap, undo,
  // selecting a different node).
  useEffect(() => {
    setLocal(value)
  }, [value])

  const commit = (next: string) => {
    if (next === value) return
    onChange(next)
  }

  return (
    // w-full + min-w-0 so the row never exceeds the Inspector column
    // (a flex item defaults to min-width:auto and can otherwise push
    // the panel wider than the 288px aside).
    <div className="flex w-full min-w-0 items-center gap-0.5">
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => commit(local)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            ;(e.currentTarget as HTMLInputElement).blur()
          } else if (e.key === 'Escape') {
            setLocal(value)
            ;(e.currentTarget as HTMLInputElement).blur()
          }
        }}
        placeholder={placeholder ?? '—'}
        className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700"
      />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Pick a preset value"
            className="flex h-7 w-5 shrink-0 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            ▾
          </button>
        </PopoverTrigger>
        {/* Popover is portal'd, so it can be wider than the Inspector.
            Long preset values (cubic-bezier(…), drop-shadow specs) wrap
            instead of overflowing — no horizontal scroll to read/pick. */}
        <PopoverContent className="max-h-60 w-56 space-y-0.5 overflow-y-auto p-1" align="end">
          <button
            type="button"
            onClick={() => {
              setLocal('')
              commit('')
            }}
            className="flex w-full items-center rounded px-2 py-1 text-xs text-gray-500 hover:bg-muted"
          >
            (clear)
          </button>
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setLocal(p)
                commit(p)
              }}
              className={cn(
                'flex w-full break-all rounded px-2 py-1 text-left text-xs hover:bg-muted',
                value === p && 'bg-primary/10 text-primary',
              )}
            >
              {p}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}
