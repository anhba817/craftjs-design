import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import type { PopoverProps } from '@/registry/components/popover'
import { useOverlayRuntime } from '@/state/overlayRuntimeStore'
import { useIsEditing } from '../../../editor/canvas/useIsEditing'
import { useOverlayStageTarget } from '../../../editor/canvas/useOverlayStageTarget'
import { OverlayCard } from '../../../editor/overlay-stage/OverlayCard'
import type { AdapterRenderProps } from '../../types'

// Popover — designer-only. Pattern A canvas: `children` is the popover
// body (drop Text / inputs / lists inside). Editing renders a labeled
// preview in the OverlayStage so the designer can author rich content.
// Runtime registers the body into the runtime store and renders
// nothing; the Button adapter wraps its label in Radix Popover and
// passes the registered body into <PopoverContent>.
export function ShadcnPopover({
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
