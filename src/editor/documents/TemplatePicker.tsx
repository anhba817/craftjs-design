import { LayoutTemplate } from 'lucide-react'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { listTemplates } from '@/persistence/templates/registry'

// Popover-based template picker. Each row is "name — short description".
// Clicking a template fires onPick and closes; the parent menu handles the
// actual document creation.
export function TemplatePicker({
  onPick,
}: {
  onPick: (templateId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const templates = listTemplates()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
        >
          <LayoutTemplate size={14} className="text-gray-500" />
          New from template…
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1" align="start" side="right">
        {templates.length === 0 ? (
          <div className="p-3 text-xs text-gray-400">No templates registered.</div>
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
                  'flex w-full flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left hover:bg-muted',
                )}
              >
                <span className="text-sm font-medium text-gray-800">{t.name}</span>
                <span className="text-[11px] text-gray-500">{t.description}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
