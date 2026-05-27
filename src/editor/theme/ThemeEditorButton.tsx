import { useState } from 'react'
import { ThemeEditorDialog } from './ThemeEditorDialog'

// Phase 12 § 4.10 — top-bar launcher for the visual theme editor. Owns the
// dialog open state so the rest of the top bar stays stateless.
export function ThemeEditorButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
      >
        Edit theme
      </button>
      <ThemeEditorDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
