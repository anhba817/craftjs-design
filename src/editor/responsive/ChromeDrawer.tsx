import { useEffect, useRef } from 'react'
import { useEditorViewport } from './useEditorViewport'

// Phase 25 (Group A) — the off-canvas drawer shell for a side panel.
//
// At ≥ lg it's a NO-OP: it renders its children inline so the panel stays a
// docked column (the panel owns its own width/border). Below lg, when `open`,
// it renders the panel as an overlay drawer sliding in from `side`, over the
// canvas, with a backdrop — so the canvas keeps full width.
//
// A11y: `aria-modal` dialog, Esc + backdrop close, focus moves into the drawer
// on open and is restored to the trigger on close, and Tab is trapped within.
// Chrome-themed via `--ed-*` tokens only (keeps `check:chrome` green).

export interface ChromeDrawerProps {
  side: 'left' | 'right'
  open: boolean
  onClose: () => void
  /** Accessible name for the dialog (e.g. "Components and layers"). */
  label: string
  children: React.ReactNode
}

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement)
}

export function ChromeDrawer({
  side,
  open,
  onClose,
  label,
  children,
}: ChromeDrawerProps) {
  const { isDesktop } = useEditorViewport()
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  // Focus management + Esc + Tab trap — only while mounted as an overlay.
  useEffect(() => {
    if (isDesktop || !open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    // Move focus into the drawer (first focusable, else the panel itself).
    const first = panel ? focusables(panel)[0] : null
    ;(first ?? panel)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = focusables(panel)
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      // Restore focus to whatever opened the drawer.
      restoreRef.current?.focus?.()
    }
  }, [isDesktop, open, onClose])

  // Docked column (≥ lg) — render children as-is; the panel owns its box.
  if (isDesktop) return <>{children}</>

  if (!open) return null

  const sideClass = side === 'left' ? 'left-0 border-r' : 'right-0 border-l'

  return (
    <div className="absolute inset-0 z-40">
      {/* Backdrop dims the canvas; click to close. */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        // w-auto so the drawer is exactly as wide as the panel inside it
        // (LeftAside w-56 / RightPanel w-72); capped on very small screens.
        className={`absolute inset-y-0 ${sideClass} flex w-auto max-w-[90%] flex-col border-ed-border bg-ed-surface text-ed-text shadow-xl outline-none`}
      >
        {children}
      </div>
    </div>
  )
}
