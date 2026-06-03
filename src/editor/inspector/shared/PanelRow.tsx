import type { ReactNode } from 'react'

// Standard inspector row: short label on the left, controls on the right.
// Used by every panel for consistent visual rhythm.
export function PanelRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    // min-w-0 on the row AND the control column is load-bearing: a flex
    // item defaults to min-width:auto, so without it a control whose
    // intrinsic content is wide (NumericInput's input + −/+/▾ buttons,
    // FlexibleSelect's input + ▾) refuses to shrink and pushes the whole
    // column past the Inspector's 288px width, forcing horizontal scroll.
    <div className="flex min-w-0 items-start gap-2">
      {/* w-20 fits humanized PropsPanel labels like "Current slide" or
          "Show chevrons" on a single line; `whitespace-normal break-words
          leading-tight` lets unusually long labels wrap onto two lines
          rather than overflow into the control column. `pt-1` re-centers
          the (potentially wrapped) label against the control's standard
          row height. */}
      <span className="w-20 shrink-0 whitespace-normal break-words pt-1 text-xs leading-tight text-ed-text-muted">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
