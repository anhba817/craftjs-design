import { Braces } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useTemplateVariables, type TemplateVariable } from './EditorTemplateVariablesProvider'

// Phase 26 (Group C) — the `{{ }}` insert picker. Lists the host's declared
// template variables (grouped by `group`); selecting one calls `onPick(key)`.
// Renders NOTHING when the host configured no variables, so the feature is
// invisible until opted into. Chrome-themed via `--ed-*`.

export function TemplateVariablePicker({
  onPick,
}: {
  onPick: (key: string) => void
}) {
  const variables = useTemplateVariables()
  if (variables.length === 0) return null

  // Group by `group` (ungrouped first), preserving declaration order.
  const groups = new Map<string, TemplateVariable[]>()
  for (const v of variables) {
    const g = v.group ?? ''
    const list = groups.get(g) ?? []
    list.push(v)
    groups.set(g, list)
  }

  return (
    <Popover>
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
        className="max-h-72 w-64 overflow-y-auto border-ed-border bg-ed-surface p-1 text-ed-text"
      >
        {[...groups.entries()].map(([group, vars]) => (
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
        ))}
      </PopoverContent>
    </Popover>
  )
}
