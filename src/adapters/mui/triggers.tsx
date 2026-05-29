import MuiPopover from '@mui/material/Popover'
import MuiTooltip from '@mui/material/Tooltip'
import type { ReactElement, RefObject } from 'react'
import { useState } from 'react'
import { useOverlayRuntime } from '@/state/overlayRuntimeStore'
import { useIsEditing } from '../../editor/canvas/useIsEditing'

// Phase 13 § 5.3 — shared trigger semantics for MUI adapters.
//
// MUI's Popover is anchorEl-based (not a wrapping primitive), so this
// hook takes an `anchorRef` pointing at the rendered element. The hook:
//   • returns `onClick` that toggles modal/drawer/toast/alert kinds and
//     opens the first attached popover.
//   • returns `wrap(element)` that wraps in MuiTooltip(s) for hover and
//     appends a MuiPopover anchored to the ref.
// For v1 only the FIRST popover trigger is honored — multiple popovers
// on one element would race for the anchor (uncommon UX anyway).
export function useMuiTriggers(
  triggers: readonly string[] | undefined,
  anchorRef: RefObject<HTMLElement | null>,
) {
  const editing = useIsEditing()
  const toggleOverlay = useOverlayRuntime((s) => s.toggle)
  const defs = useOverlayRuntime((s) => s.defs)
  const popoverTriggerName =
    (triggers ?? []).find((n) => defs[n]?.kind === 'popover') ?? null
  const [popoverOpen, setPopoverOpen] = useState(false)

  const onClick = editing
    ? undefined
    : () => {
        for (const name of triggers ?? []) {
          const kind = defs[name]?.kind
          if (kind === 'popover' || kind === 'tooltip') continue
          toggleOverlay(name)
        }
        if (popoverTriggerName) setPopoverOpen((o) => !o)
      }

  const wrap = (element: ReactElement): ReactElement => {
    if (editing) return element
    let result = element
    for (const name of triggers ?? []) {
      const def = defs[name]
      if (def?.kind === 'tooltip' && def.text) {
        result = (
          <MuiTooltip key={`tt-${name}`} title={def.text} arrow>
            {result}
          </MuiTooltip>
        )
      }
    }
    if (!popoverTriggerName) return result
    const popoverDef = defs[popoverTriggerName]
    return (
      <>
        {result}
        <MuiPopover
          open={popoverOpen}
          onClose={() => setPopoverOpen(false)}
          anchorEl={anchorRef.current}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <div className="p-3 text-sm">{popoverDef?.content}</div>
        </MuiPopover>
      </>
    )
  }

  return { onClick, wrap }
}
