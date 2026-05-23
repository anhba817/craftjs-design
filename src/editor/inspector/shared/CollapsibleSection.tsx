import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

// Native <details>/<summary> wrapper with the Inspector's visual rhythm.
// Browser handles open/closed state internally — no React state needed, no
// data persistence (the user's collapse choice is ephemeral, matches
// activeBreakpoint and link/unlink in BoxSidesEditor).
//
// `list-none` strips the default disclosure triangle so we can render our own
// chevron consistently. group/group-open + transition flips chevron on open.
export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between py-1">
        <span className="text-xs font-semibold tracking-wide uppercase text-gray-500">
          {title}
        </span>
        <ChevronDown className="size-3 text-gray-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  )
}
