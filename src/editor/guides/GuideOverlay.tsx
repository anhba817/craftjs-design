import { useDragGuides } from './useDragGuides'

// Phase 11 § 3.6 — fixed-position guide overlay.
//
// Renders up to two thin red lines (one per axis) at the alignment
// positions reported by useDragGuides. Lines span the full viewport
// for the cross-axis dimension, matching Figma's behavior — the
// designer sees the line cut across the entire canvas so it's easy
// to scan for what's aligning.
//
// Lines render at z-50 (above the canvas + the ResizeOverlay so the
// drag operator can see the guides regardless of selection state).
// `pointer-events: none` keeps the overlay inert — it never
// intercepts drag events.

export function GuideOverlay() {
  const guides = useDragGuides()
  if (!guides || guides.length === 0) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
      {guides.map((m, i) => {
        if (m.axis === 'horizontal') {
          // Full-width horizontal line at y=position.
          return (
            <div
              key={`${m.axis}-${i}`}
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                top: m.position,
                height: 1,
                background: 'rgb(220 38 38)', // red-600
              }}
            />
          )
        }
        return (
          <div
            key={`${m.axis}-${i}`}
            style={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: m.position,
              width: 1,
              background: 'rgb(220 38 38)',
            }}
          />
        )
      })}
    </div>
  )
}
