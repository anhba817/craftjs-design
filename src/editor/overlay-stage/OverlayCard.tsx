import type { ReactNode } from 'react'

// Phase 13 § 5.3 — visual chrome wrapping every overlay rendered into
// the OverlayStage. A small label header lets the designer tell which
// overlay is which when several stack in the stage (e.g., a Modal and a
// Tooltip both attached to different Buttons).
interface OverlayCardProps {
  label: string
  name: string
  children: ReactNode
}

export function OverlayCard({ label, name, children }: OverlayCardProps) {
  return (
    <section className="rounded-md border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-gray-100 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-gray-500">
        <span className="font-medium text-gray-700">{label}</span>
        <code className="text-gray-500">{name}</code>
      </header>
      <div className="p-3">{children}</div>
    </section>
  )
}
