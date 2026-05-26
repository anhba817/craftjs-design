import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

// Phase 11 § 3.8 — first-load onboarding tour.
//
// Four steps walk the user through the editor's regions in order:
// Components (toolbox), Canvas, Inspector, Save bar. Each step:
//   - Highlights its target via a CSS box-shadow "spotlight"
//     (the target keeps its real background; everything else is
//     dimmed by a 9999px transparent shadow).
//   - Renders a card with the step's title + description below or
//     beside the target.
//   - Has Skip (any step exits) + Next (advance) buttons. The last
//     step's button reads "Done" and writes the
//     `craftjs-design.onboarding-completed` flag to localStorage so
//     the tour doesn't re-open on next mount.
//
// Replay path: the DocumentMenu adds a "Show tour again" entry
// that clears the flag and re-opens the tour.

const STORAGE_KEY = 'craftjs-design.onboarding-completed:v1'

interface Step {
  /** Matches the data-onboarding-target attribute on the anchor. */
  target: string
  title: string
  description: string
  /** Where to anchor the tooltip relative to the target. */
  anchor: 'right' | 'left' | 'bottom'
}

const STEPS: readonly Step[] = [
  {
    target: 'toolbox',
    title: 'Components & Layers',
    description:
      'Drag components from this panel onto the canvas. Switch to the Layers tab to navigate the tree of what you’ve built.',
    anchor: 'right',
  },
  {
    target: 'canvas',
    title: 'Canvas',
    description:
      'This is your live preview. Click a component to select it, double-click text to edit in place, drag to reorder.',
    anchor: 'right',
  },
  {
    target: 'inspector',
    title: 'Inspector',
    description:
      'Tune size, spacing, typography, and per-component properties for the selected node. Use the breadcrumbs at the top to navigate up.',
    anchor: 'left',
  },
  {
    target: 'savebar',
    title: 'Save & switch documents',
    description:
      'Switch theme and adapter, import / export envelopes, save or load designs from local storage.',
    anchor: 'bottom',
  },
]

export function OnboardingTour() {
  const [open, setOpen] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // On mount: open the tour if the flag is missing.
  useEffect(() => {
    let done = false
    try {
      done = localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      // localStorage disabled — show the tour once per session.
    }
    if (!done) setOpen(true)

    // Listen for the manual "show again" event the DocumentMenu
    // dispatches. Single global event keeps the wiring loose.
    const handler = () => {
      setStepIdx(0)
      setOpen(true)
    }
    window.addEventListener('craftjs-design:show-onboarding', handler)
    return () =>
      window.removeEventListener(
        'craftjs-design:show-onboarding',
        handler,
      )
  }, [])

  // Track the target rect for each step. Re-resolves on window
  // resize / scroll so the spotlight stays glued.
  useEffect(() => {
    if (!open) return
    const step = STEPS[stepIdx]
    const recompute = () => {
      const el = document.querySelector(
        `[data-onboarding-target="${step.target}"]`,
      ) as HTMLElement | null
      setRect(el ? el.getBoundingClientRect() : null)
    }
    recompute()
    window.addEventListener('resize', recompute)
    window.addEventListener('scroll', recompute, true)
    return () => {
      window.removeEventListener('resize', recompute)
      window.removeEventListener('scroll', recompute, true)
    }
  }, [open, stepIdx])

  const close = () => {
    setOpen(false)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
  }

  if (!open) return null
  const step = STEPS[stepIdx]
  const isLast = stepIdx === STEPS.length - 1

  // Compute tooltip position. If we have a rect, dock the card to
  // the anchor side; otherwise fall back to centered.
  const tooltipStyle: React.CSSProperties = (() => {
    if (!rect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }
    const gap = 12
    if (step.anchor === 'right') {
      return {
        position: 'fixed',
        left: rect.right + gap,
        top: rect.top + 24,
      }
    }
    if (step.anchor === 'left') {
      return {
        position: 'fixed',
        right: window.innerWidth - rect.left + gap,
        top: rect.top + 24,
      }
    }
    // bottom
    return {
      position: 'fixed',
      left: Math.max(16, rect.left),
      top: rect.bottom + gap,
    }
  })()

  return (
    <div
      role="dialog"
      aria-label={`Onboarding tour — step ${stepIdx + 1} of ${STEPS.length}`}
      className="fixed inset-0 z-[60]"
    >
      {/* Spotlight: a positioned-fixed div sized + positioned to the
          target, with a 9999px transparent box-shadow that dims
          everything outside it. pointer-events-none so the user's
          attention can still interact with the rest of the editor
          if they want (the tour is non-blocking). */}
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none rounded-md"
          style={{
            position: 'fixed',
            left: rect.left - 4,
            top: rect.top - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
        />
      )}
      {/* If the target couldn't be resolved, dim full-screen so the
          card still has contrast. */}
      {!rect && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        />
      )}
      {/* Card */}
      <div
        style={tooltipStyle}
        className="pointer-events-auto w-72 rounded-lg border border-border bg-popover p-4 text-sm shadow-lg"
      >
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Step {stepIdx + 1} of {STEPS.length}
        </div>
        <div className="mb-1 text-base font-semibold text-foreground">
          {step.title}
        </div>
        <div className="mb-3 text-xs text-muted-foreground">
          {step.description}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={close}
            className="text-xs"
          >
            Skip tour
          </Button>
          <div className="flex items-center gap-1.5">
            {stepIdx > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStepIdx((i) => i - 1)}
                className="text-xs"
              >
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (isLast) close()
                else setStepIdx((i) => i + 1)
              }}
              className="text-xs"
            >
              {isLast ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Public helper: clears the completion flag and re-opens the tour.
// DocumentMenu's "Show tour again" entry calls this.
export function reopenOnboardingTour(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent('craftjs-design:show-onboarding'))
}
