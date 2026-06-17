import { Search, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { iconNames } from 'lucide-react/dynamic'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { resolveIcon } from '@/icons/resolver'

// Phase 27 Group D — the searchable icon picker. Replaces the old 16-option
// dropdown for the Icon canonical's `name` and NavItem's `icon` (wired in
// PropsPanel via ICON_FIELDS). Searches the FULL lucide set (~1960 names) and
// virtualizes the grid so only on-screen rows mount — each visible cell renders
// through the icon resolver (lazy DynamicIcon), so glyph chunks load on demand
// rather than all at once. Chrome-themed via `--ed-*` only.

const ALL_NAMES = iconNames as readonly string[]
const COLS = 6
const CELL_PX = 34 // square cell + grid row height

export function IconPicker({
  value,
  onChange,
  // NavItem allows "no icon" ('' clears it); the Icon canonical always has a
  // name, but clearing is harmless (renders the fallback). Shown by default.
  clearable = true,
}: {
  value: string
  onChange: (next: string) => void
  clearable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const scrollerRef = useRef<HTMLDivElement>(null)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () => (q ? ALL_NAMES.filter((n) => n.includes(q)) : ALL_NAMES),
    [q],
  )
  const rowCount = Math.ceil(filtered.length / COLS)

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => CELL_PX,
    overscan: 4,
  })

  const pick = (name: string) => {
    onChange(name)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Choose icon"
          className="flex w-full items-center gap-2 rounded border border-ed-border-2 bg-ed-surface px-2 py-1 text-left text-sm text-ed-text hover:bg-ed-surface-2"
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            {value ? resolveIcon(value, 16) : null}
          </span>
          <span className={cn('truncate', !value && 'text-ed-text-faint')}>
            {value || 'Select icon…'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex h-80 w-64 flex-col border-ed-border bg-ed-surface p-0 text-ed-text"
      >
        {/* Search — sticky above the scrolling grid. */}
        <div className="flex shrink-0 items-center gap-1.5 border-b border-ed-border px-2 py-1.5">
          <Search size={13} className="shrink-0 text-ed-text-faint" aria-hidden />
          <input
            type="text"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered[0]) {
                e.preventDefault()
                pick(filtered[0])
              }
            }}
            placeholder="Search icons…"
            aria-label="Search icons"
            className="w-full bg-transparent text-sm text-ed-text outline-none placeholder:text-ed-text-faint"
          />
          {clearable && value && (
            <button
              type="button"
              aria-label="No icon"
              title="No icon"
              onClick={() => pick('')}
              className="shrink-0 rounded p-0.5 text-ed-text-muted hover:bg-ed-surface-2 hover:text-ed-text"
            >
              <X size={13} aria-hidden />
            </button>
          )}
        </div>

        <div
          ref={scrollerRef}
          className="min-h-0 flex-1 overflow-y-auto p-1"
          role="listbox"
          aria-label="Icons"
        >
          {filtered.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-ed-text-muted">
              No icons match “{query}”.
            </div>
          ) : (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: 'relative',
                width: '100%',
              }}
            >
              {virtualizer.getVirtualItems().map((vi) => {
                const start = vi.index * COLS
                const rowNames = filtered.slice(start, start + COLS)
                return (
                  <div
                    key={vi.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${vi.start}px)`,
                      height: vi.size,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                    }}
                  >
                    {rowNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        aria-label={name}
                        aria-selected={name === value}
                        onClick={() => pick(name)}
                        className={cn(
                          'flex aspect-square items-center justify-center rounded text-ed-text hover:bg-ed-surface-2',
                          name === value && 'bg-ed-surface-2 ring-1 ring-ed-border',
                        )}
                      >
                        {resolveIcon(name, 18)}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
