import { cn } from '@/lib/utils'
import { useEditorStore, type ColorMode } from '@/state/editorStore'

// Phase 12 § 4.13 — light / dark / system color-mode switch in the top bar.
// 'System' follows the OS preference (resolved by useEffectiveColorScheme);
// the chosen mode is saved with the document.
const MODES: { value: ColorMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' },
]

export function ColorModeToggle() {
  const colorMode = useEditorStore((s) => s.colorMode)
  const setColorMode = useEditorStore((s) => s.setColorMode)

  return (
    <div className="flex rounded border border-ed-border bg-ed-surface-2 p-0.5 text-xs">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => setColorMode(m.value)}
          className={cn(
            'rounded px-1.5 py-0.5 transition-colors',
            colorMode === m.value
              ? 'bg-ed-surface text-ed-text-strong shadow-sm'
              : 'text-ed-text-muted hover:text-ed-text',
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
