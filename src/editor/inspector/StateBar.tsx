import { cn } from '@/lib/utils'
import { STYLE_STATES, type StyleState } from '@/style/dimensions'
import { useEditorStore } from '@/state/editorStore'

// Phase 12 § 4.2 — pseudo-class state selector. Sits beside the
// ResponsiveBar; together they pick which (breakpoint × state)
// quadrant the panels read/write. 'base' is the normal/default state;
// hover/focus/active author the corresponding pseudo-class variant.
//
// When a non-base state is active, the selected node previews that
// state on the canvas (CanonicalNode applies the quadrant's styles
// unprefixed to the selected node) so the designer sees the look
// without having to actually hover/focus/press it.

const LABELS: Record<StyleState, string> = {
  base: 'Default',
  hover: 'Hover',
  focus: 'Focus',
  active: 'Active',
}

export function StateBar() {
  const active = useEditorStore((s) => s.activeState)
  const set = useEditorStore((s) => s.setActiveState)
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint)

  return (
    <div className="space-y-1 border-b border-ed-border px-2 py-2">
      <div className="flex gap-1">
        {STYLE_STATES.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => set(st)}
            className={cn(
              'rounded px-2 py-1 text-xs tracking-wide transition-colors',
              active === st
                ? 'bg-ed-accent text-ed-accent-fg'
                : 'text-ed-text-muted hover:bg-ed-surface-3',
            )}
          >
            {LABELS[st]}
          </button>
        ))}
      </div>
      {active !== 'base' && (
        <div className="text-[10px] text-ed-text-muted">
          editing{' '}
          <span className="font-medium text-ed-text">
            :{active}
            {activeBreakpoint !== 'base' ? ` @ ${activeBreakpoint}` : ''}
          </span>{' '}
          — previewed on the selected node
        </div>
      )}
    </div>
  )
}
