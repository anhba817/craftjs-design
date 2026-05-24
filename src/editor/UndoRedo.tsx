import { useEditor } from '@craftjs/core'
import { Redo2, Undo2 } from 'lucide-react'
import { useEffect } from 'react'

// Toolbar buttons + global keyboard shortcuts for Craft.js's built-in history.
// canUndo / canRedo are read via the useEditor collector so the buttons
// re-enable / disable as the timeline pointer moves.
//
// Cmd/Ctrl+Z → undo; Cmd/Ctrl+Shift+Z → redo. Listener is attached to window
// and skips events whose target is an editable element (input / textarea /
// contentEditable) so the shortcut doesn't steal native browser undo there.
export function UndoRedo() {
  const { actions, canUndo, canRedo } = useEditor((_state, query) => ({
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey
      if (!cmd) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) actions.history.undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        if (canRedo) actions.history.redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [actions, canUndo, canRedo])

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => actions.history.undo()}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (⌘Z)"
        className="rounded border border-gray-300 px-1.5 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
      >
        <Undo2 size={14} />
      </button>
      <button
        type="button"
        onClick={() => actions.history.redo()}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (⌘⇧Z)"
        className="rounded border border-gray-300 px-1.5 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
      >
        <Redo2 size={14} />
      </button>
    </div>
  )
}
