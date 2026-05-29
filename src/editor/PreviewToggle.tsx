import { useEditor } from '@craftjs/core'
import { Eye, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

// Phase 13 § 5.3 — preview / edit toggle in the top bar. Flips Craft's
// `state.options.enabled`; downstream surfaces (the entire `useIsEditing`
// chain, ResizeOverlay, drag handles, the Toolbox's selection-aware
// drop, etc.) read this and adjust. Useful for visually checking how
// overlay components (Tooltip / Popover) and other inline-open
// canonicals look at runtime without leaving the editor.
export function PreviewToggle() {
  const { enabled, actions } = useEditor((state) => ({
    enabled: state.options.enabled,
  }))
  const toggle = () => actions.setOptions((o) => (o.enabled = !enabled))
  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? 'Preview' : 'Resume editing'}
      aria-pressed={!enabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs',
        enabled
          ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          : 'border-primary bg-primary text-primary-foreground',
      )}
    >
      {enabled ? <Eye size={14} /> : <Pencil size={14} />}
      {enabled ? 'Preview' : 'Editing'}
    </button>
  )
}
