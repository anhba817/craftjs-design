import { useEditor } from '@craftjs/core'
import { cn } from '@/lib/utils'

// Phase 13 § 5.3 — Overlay Stage.
//
// Modals / Drawers / Toasts / Tooltips / Popovers don't render inline
// in the canvas anymore — they portal here in editing mode so the
// designer can see them without polluting the page layout. At runtime
// each overlay falls back to its library primitive (portaled to body
// with proper z-stack + backdrop).
//
// The stage is just a styled portal target. Overlay adapters look up
// `#craftjs-overlay-stage` via `useOverlayStageTarget` and createPortal
// their preview into it. The visual chrome (header, padding, scrollbar)
// is owned here so every adapter looks consistent.

const OVERLAY_DISPLAYNAMES = [
  'Modal',
  'Drawer',
  'Toast',
  'Tooltip',
  'Popover',
] as const

// Phase 25 — the Overlay-stage BODY (no outer <aside>/header). Rendered as the
// "Overlays" tab of RightPanel. The `#craftjs-overlay-stage` portal target must
// stay mounted whichever tab is active (overlays portal into it via
// useOverlayStageTarget), so RightPanel keeps this mounted and toggles
// visibility rather than unmounting it.
export function OverlayStageBody() {
  // Subscribe so the empty-state hint reflects current overlay count.
  const { count } = useEditor((state) => {
    let n = 0
    for (const node of Object.values(state.nodes)) {
      const dn = node.data.displayName as string | undefined
      if (dn && OVERLAY_DISPLAYNAMES.includes(dn as never)) n++
    }
    return { count: n }
  })

  return (
    <div
      id="craftjs-overlay-stage"
      aria-label="Overlay stage"
      className={cn(
        'flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto p-3',
        count === 0 && 'items-center justify-center',
      )}
    >
      {count === 0 && (
        <p className="max-w-[14rem] text-center text-[11px] leading-relaxed text-ed-text-muted">
          Right-click a Button on the canvas and choose{' '}
          <span className="font-medium text-ed-text">Attach overlay</span> to add
          a Modal / Drawer / Toast / Tooltip / Popover.
        </p>
      )}
    </div>
  )
}
