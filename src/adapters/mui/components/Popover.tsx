import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { PopoverProps } from '@/registry/components/popover'
import { useOverlayRuntime } from '@/state/overlayRuntimeStore'
import { useIsEditing } from '../../../editor/canvas/useIsEditing'
import { useOverlayStageTarget } from '../../../editor/canvas/useOverlayStageTarget'
import { OverlayCard } from '../../../editor/overlay-stage/OverlayCard'
import type { AdapterRenderProps } from '../../types'

// MUI Popover — designer-only. Pattern A canvas: `children` is the
// popover body. Editor portals a preview into the OverlayStage.
// Runtime registers the body into the runtime store and renders
// nothing; the Button adapter wraps its label in MuiPopover anchored
// to itself, passing the registered body.
export function MaterialPopover({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { name } = props as PopoverProps
  const editing = useIsEditing()
  const register = useOverlayRuntime((s) => s.register)
  const unregister = useOverlayRuntime((s) => s.unregister)
  const stageTarget = useOverlayStageTarget()

  useEffect(() => {
    register(name, { kind: 'popover', content: children })
    return () => unregister(name)
  }, [name, children, register, unregister])

  if (editing) {
    if (!stageTarget) return null
    return createPortal(
      <OverlayCard label="Popover" name={name}>
        <div ref={rootRef} className={cn(className)} style={inlineStyle}>
          {children}
        </div>
      </OverlayCard>,
      stageTarget,
    )
  }
  return null
}
