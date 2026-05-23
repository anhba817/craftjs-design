import { useEditorStore } from '@/state/editorStore'
import type { Breakpoint } from '@/state/editorStore'
import { cn } from '@/lib/utils'

const BREAKPOINTS: readonly Breakpoint[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl']

// Inspector pill bar above all panels. Active pill = which breakpoint slice
// the panels read/write. 'base' targets style.classes; the others target
// style.responsive[bp]. Status line below the pills makes the write target
// loud so users don't accidentally author breakpoint-specific overrides.
export function ResponsiveBar() {
  const active = useEditorStore((s) => s.activeBreakpoint)
  const set = useEditorStore((s) => s.setActiveBreakpoint)

  return (
    <div className="space-y-1 border-b border-gray-200 px-2 py-2">
      <div className="flex gap-1">
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp}
            type="button"
            onClick={() => set(bp)}
            className={cn(
              'rounded px-2 py-1 text-xs uppercase tracking-wide transition-colors',
              active === bp
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-600 hover:bg-muted',
            )}
          >
            {bp}
          </button>
        ))}
      </div>
      <div className="text-[10px] text-gray-500">
        writing to:{' '}
        <span className="font-medium text-gray-700">
          {active === 'base' ? 'base (always applied)' : `${active} breakpoint and up`}
        </span>
      </div>
    </div>
  )
}
