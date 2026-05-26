import { useEditor } from '@craftjs/core'
import { useEffect } from 'react'
import { useClipboardActions } from './useClipboardActions'

// Phase 11 § 3.2 — global keyboard listener for clipboard shortcuts.
//
// Cmd+C / Ctrl+C → copy the first selected node.
// Cmd+X / Ctrl+X → cut.
// Cmd+V / Ctrl+V → paste at the selection-aware target.
// Cmd+D / Ctrl+D → duplicate.
//
// Gated by:
//   - document.activeElement is NOT an INPUT / TEXTAREA / contenteditable
//     (so the user can still Cmd+C selected text in the Inspector or hex
//     fields without copying the canvas node).
//   - There IS a selected node (Cmd+V is allowed with no selection — it
//     just pastes at ROOT — but Cmd+C / X / D require something to act on).
//
// Mounted once at editor scope via <ClipboardKeyboardMount /> below.

export function useClipboardKeyboard(): void {
  const { copy, cut, paste, duplicate } = useClipboardActions()
  const { query } = useEditor()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          // Native form input — let the browser handle Cmd+C etc.
          return
        }
      }
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      switch (e.key.toLowerCase()) {
        case 'c': {
          const id = query.getEvent('selected').first()
          if (!id) return
          e.preventDefault()
          copy(id)
          break
        }
        case 'x': {
          const id = query.getEvent('selected').first()
          if (!id) return
          e.preventDefault()
          cut(id)
          break
        }
        case 'v': {
          e.preventDefault()
          paste()
          break
        }
        case 'd': {
          const id = query.getEvent('selected').first()
          if (!id) return
          // Cmd+D in browsers is "bookmark this page" — we override.
          e.preventDefault()
          duplicate(id)
          break
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [copy, cut, paste, duplicate, query])
}
