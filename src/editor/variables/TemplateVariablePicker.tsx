import { Braces, Search } from 'lucide-react'
import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useTemplateVariables, type TemplateVariable } from './EditorTemplateVariablesProvider'

// Phase 26 (Group C) — the `{{ }}` insert picker. Lists the host's declared
// template variables (grouped by `group`), with a search box to filter by
// key / label / group; selecting one calls `onPick(key)`. Renders NOTHING when
// the host configured no variables. Chrome-themed via `--ed-*`.

function matches(v: TemplateVariable, q: string): boolean {
  return (
    v.key.toLowerCase().includes(q) ||
    (v.label?.toLowerCase().includes(q) ?? false) ||
    (v.group?.toLowerCase().includes(q) ?? false)
  )
}

export function TemplateVariablePicker({
  onPick,
}: {
  onPick: (key: string) => void
}) {
  const variables = useTemplateVariables()
  const [query, setQuery] = useState('')
  if (variables.length === 0) return null

  const q = query.trim().toLowerCase()
  const filtered = q ? variables.filter((v) => matches(v, q)) : variables

  // Group the filtered set by `group` (ungrouped first), in declaration order.
  const groups = new Map<string, TemplateVariable[]>()
  for (const v of filtered) {
    const g = v.group ?? ''
    const list = groups.get(g) ?? []
    list.push(v)
    groups.set(g, list)
  }

  return (
    <Popover onOpenChange={(open) => !open && setQuery('')}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Insert template variable"
          title="Insert a template variable"
          className="shrink-0 rounded border border-ed-border-2 p-1 text-ed-text-muted hover:bg-ed-surface-2 hover:text-ed-text"
        >
          <Braces size={14} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex max-h-72 w-64 flex-col border-ed-border bg-ed-surface p-0 text-ed-text"
      >
        {/* Search — sticky above the scrolling list. */}
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
                onPick(filtered[0].key)
              }
            }}
            placeholder="Search variables…"
            aria-label="Search variables"
            className="w-full bg-transparent text-sm text-ed-text outline-none placeholder:text-ed-text-faint"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-ed-text-muted">
              No variables match “{query}”.
            </div>
          ) : (
            [...groups.entries()].map(([group, vars]) => (
              <div key={group} role="group" aria-label={group || undefined}>
                {group && (
                  <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold tracking-wide uppercase text-ed-text-muted">
                    {group}
                  </div>
                )}
                {vars.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => onPick(v.key)}
                    className="flex w-full flex-col items-start gap-0.5 rounded px-2 py-1 text-left hover:bg-ed-surface-2"
                  >
                    <span className="text-sm text-ed-text">{v.label ?? v.key}</span>
                    <span className="flex w-full items-baseline justify-between gap-2">
                      <code className="text-[11px] text-ed-text-muted">{`{{ ${v.key} }}`}</code>
                      {v.sample !== undefined && (
                        <span className="truncate text-[11px] text-ed-text-faint">
                          {v.sample}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
