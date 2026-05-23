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
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
