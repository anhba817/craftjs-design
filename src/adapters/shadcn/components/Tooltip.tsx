import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { TooltipProps } from '@/registry/components/tooltip'
import { useOverlayRuntime } from '@/state/overlayRuntimeStore'
import { useIsEditing } from '../../../editor/canvas/useIsEditing'
import { useOverlayStageTarget } from '../../../editor/canvas/useOverlayStageTarget'
import { OverlayCard } from '../../../editor/overlay-stage/OverlayCard'
import type { AdapterRenderProps } from '../../types'

// Tooltip — designer-only. Renders a labeled preview in the
// OverlayStage so the body content is editable. At runtime, registers
// its `content` into the overlay runtime store under `name` and
// renders nothing — the Button adapter looks up the def via its
// `triggers` array and wraps its label in <Tooltip><TooltipContent>…
// using the library's real hover semantics.
export function ShadcnTooltip({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { content, name } = props as TooltipProps
  const editing = useIsEditing()
  const register = useOverlayRuntime((s) => s.register)
  const unregister = useOverlayRuntime((s) => s.unregister)
  const stageTarget = useOverlayStageTarget()

  // Mirror this tooltip's content into the runtime registry so any
  // Button trigger pointing at `name` can wrap with the real Tooltip
  // primitive. Re-runs whenever the text changes.
  useEffect(() => {
    register(name, { kind: 'tooltip', text: content })
    return () => unregister(name)
  }, [name, content, register, unregister])

  if (editing) {
    if (!stageTarget) return null
    return createPortal(
      <OverlayCard label="Tooltip" name={name}>
        <div
          ref={rootRef}
          className={cn('inline-block', className)}
          style={inlineStyle}
        >
          {content}
        </div>
      </OverlayCard>,
      stageTarget,
    )
  }

  // Runtime — tooltip content is consumed by the Button that triggers
  // it. The tooltip node itself contributes nothing to the DOM.
  return null
}
