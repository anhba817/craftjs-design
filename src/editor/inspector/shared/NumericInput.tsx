import { useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// Hybrid numeric input: accepts a token from a known list OR an arbitrary CSS
// value (`13px`, `50%`, `1.5rem`). Step buttons walk the token list; a small
// dropdown shows the full token set; the text field accepts free input.
//
// The component is presentation-only: it emits raw strings via onChange. The
// parent panel classifies the value (token vs arbitrary) and writes to either
// `style.classes` (via a tw-classes merge function) or `style.inline` /
// `style.responsiveInline` (Phase 6 — arbitrary values now work at every
// breakpoint).

const ARBITRARY_RE = /^-?\d+(\.\d+)?(px|%|em|rem|vh|vw|ch|fr)$/

interface NumericInputProps {
  value: string
  tokens: readonly string[]
  onChange: (next: string) => void
  placeholder?: string
}

export function NumericInput({
  value,
  tokens,
  onChange,
  placeholder,
}: NumericInputProps) {
  const [localValue, setLocalValue] = useState(value)

  // Sync local state with prop when prop changes (e.g., theme swap, undo).
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const tokenIndex = tokens.indexOf(value)
  const canStepUp = tokenIndex >= 0 && tokenIndex < tokens.length - 1
  const canStepDown = tokenIndex > 0

  const commit = (next: string) => {
    if (next === value) return
    if (next === '') {
      onChange('')
      return
    }
    if (tokens.includes(next)) {
      onChange(next)
      return
    }
    if (ARBITRARY_RE.test(next)) {
      onChange(next)
      return
    }
    // Invalid input — revert to prop value.
    setLocalValue(value)
  }

  return (
    <div className="flex items-center gap-0.5">
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => commit(localValue)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            ;(e.currentTarget as HTMLInputElement).blur()
          } else if (e.key === 'Escape') {
            setLocalValue(value)
            ;(e.currentTarget as HTMLInputElement).blur()
          }
        }}
        placeholder={placeholder ?? '—'}
        className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700"
      />
      <button
        type="button"
        onClick={() => onChange(tokens[tokenIndex - 1])}
        disabled={!canStepDown}
        aria-label="Decrease"
        className="flex h-7 w-5 shrink-0 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
      >
        −
      </button>
      <button
        type="button"
        onClick={() => onChange(tokens[tokenIndex + 1])}
        disabled={!canStepUp}
        aria-label="Increase"
        className="flex h-7 w-5 shrink-0 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
      >
        +
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Pick token"
            className="flex h-7 w-5 shrink-0 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            ▾
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-40 space-y-0.5 p-1" align="end">
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex w-full items-center rounded px-2 py-1 text-xs text-gray-500 hover:bg-muted"
          >
            (clear)
          </button>
          {tokens.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={cn(
                'flex w-full items-center rounded px-2 py-1 text-left text-xs hover:bg-muted',
                value === t && 'bg-primary/10 text-primary',
              )}
            >
              {t}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}
