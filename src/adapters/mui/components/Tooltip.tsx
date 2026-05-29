import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { TooltipProps } from '@/registry/components/tooltip'
import { useOverlayRuntime } from '@/state/overlayRuntimeStore'
import { useIsEditing } from '../../../editor/canvas/useIsEditing'
import { useOverlayStageTarget } from '../../../editor/canvas/useOverlayStageTarget'
import { OverlayCard } from '../../../editor/overlay-stage/OverlayCard'
import type { AdapterRenderProps } from '../../types'

// MUI Tooltip — designer-only. Editor portals a preview into the
// OverlayStage. Runtime registers content into the runtime store and
// renders nothing; the Button adapter wraps its label in MuiTooltip
// keyed by the registered `name`.
export function MaterialTooltip({
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
  return null
}
