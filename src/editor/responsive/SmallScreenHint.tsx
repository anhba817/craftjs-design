import { Info, X } from 'lucide-react'
import { useState } from 'react'
import { useEditorViewport } from './useEditorViewport'

// Phase 25 (Group D) — a dismissible hint shown on phone-sized viewports
// (< sm). The editor is usable there (inspect, select, edit props, reorder via
// Layers, save), but drag-to-add a component from the toolbox uses HTML5
// drag-and-drop, which doesn't fire on touch — so it wants a pointer / a larger
// screen. NOT a hard block; just sets expectations. Dismissal persists in
// localStorage. Document-management chrome, so hidden under `hideChrome`.

const STORAGE_KEY = 'craftjs-design.small-screen-hint-dismissed:v1'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function SmallScreenHint() {
  const { isPhone } = useEditorViewport()
  const [dismissed, setDismissed] = useState(readDismissed)

  if (!isPhone || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // localStorage disabled — dismiss for this session only.
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 border-b border-ed-border bg-ed-surface-2 px-3 py-1.5 text-xs text-ed-text-muted"
    >
      <Info size={14} className="shrink-0" aria-hidden />
      <span className="flex-1">
        Optimized for larger screens. You can edit and reorder here, but
        dragging a new component onto the canvas needs a pointer (mouse/trackpad).
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="shrink-0 rounded p-1 text-ed-text-muted hover:bg-ed-surface-3 hover:text-ed-text"
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  )
}
