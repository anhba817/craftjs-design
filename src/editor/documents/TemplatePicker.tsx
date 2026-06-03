import { LayoutTemplate } from 'lucide-react'
import { useMemo, useState, useSyncExternalStore } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  getTemplateRegistryVersion,
  listTemplates,
  subscribeTemplateRegistry,
} from '@/persistence/templates/registry'

// Popover-based template picker. Each row is "name — short description".
// Clicking a template fires onPick and closes; the parent menu handles the
// actual document creation.
//
// Phase 10 § 2.10 — subscribes to the template registry's version
// counter so registerTemplate() / unregisterTemplate() calls after
// mount refresh the list without requiring the user to close + reopen
// the popover.
export function TemplatePicker({
  onPick,
}: {
  onPick: (templateId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const version = useSyncExternalStore(
    subscribeTemplateRegistry,
    getTemplateRegistryVersion,
    getTemplateRegistryVersion,
  )
  const templates = useMemo(() => listTemplates(), [version])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-ed-text hover:bg-ed-surface-3"
        >
          <LayoutTemplate size={14} className="text-ed-text-muted" />
          New from template…
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1" align="start" side="right">
        {templates.length === 0 ? (
          <div className="p-3 text-xs text-ed-text-faint">No templates registered.</div>
        ) : (
          <div className="space-y-0.5">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onPick(t.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left hover:bg-ed-surface-3',
                )}
              >
                <span className="text-sm font-medium text-ed-text-strong">{t.name}</span>
                <span className="text-[11px] text-ed-text-muted">{t.description}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
