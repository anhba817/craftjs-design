import { useEditor } from '@craftjs/core'
import { MousePointerClick } from 'lucide-react'
import { TemplatePicker } from '../documents/TemplatePicker'
import { useDocumentSwitcher } from '../documents/useDocumentSwitcher'

// Phase 11 § 3.7 — first-load hint when the canvas is empty.
//
// Renders centered over the canvas viewport when ROOT has no
// children (typical first load after creating a blank doc). Two
// affordances:
//   - Implicit: an icon + heading point the user toward the
//     toolbox.
//   - Explicit: a "Start from a template" button opens
//     TemplatePicker, which spins up a new document from the
//     chosen template via the same createFromTemplate flow
//     DocumentMenu uses.
//
// Subscribes to ROOT's nodes count via useEditor — re-renders
// only when that count crosses zero, so dragging in the first
// component immediately swaps the hint out for the canvas content.

export function EmptyCanvasHint() {
  const { rootIsEmpty } = useEditor((_state, query) => {
    try {
      const root = query.node('ROOT').get()
      const children = (root.data.nodes as string[] | undefined) ?? []
      return { rootIsEmpty: children.length === 0 }
    } catch {
      // No ROOT yet (very early in hydration). Treat as empty so
      // the hint shows; once Craft commits the tree it'll re-render.
      return { rootIsEmpty: true }
    }
  })

  const { createFromTemplate } = useDocumentSwitcher()

  if (!rootIsEmpty) return null

  return (
    <div
      // Centered absolute overlay. `pointer-events-none` on the
      // outer wrapper keeps drops on the underlying canvas working;
      // the inner card re-enables pointer events so the CTA button
      // is clickable.
      aria-label="Empty canvas hint"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/80 px-8 py-6 text-center backdrop-blur-sm">
        <MousePointerClick
          className="size-10 text-muted-foreground"
          aria-hidden
        />
        <div className="text-sm font-medium text-foreground">
          Drop a component to start
        </div>
        <div className="text-xs text-muted-foreground">
          Drag from the Components tab on the left.
        </div>
        <div className="mt-1">
          <TemplatePicker
            onPick={(templateId) => {
              createFromTemplate(templateId, 'Untitled from template')
            }}
          />
        </div>
      </div>
    </div>
  )
}
