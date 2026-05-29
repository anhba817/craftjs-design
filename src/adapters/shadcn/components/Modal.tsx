import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ModalProps } from '@/registry/components/modal'
import {
  readOverlayOpen,
  useOverlayRuntime,
} from '@/state/overlayRuntimeStore'
import { useIsEditing } from '../../../editor/canvas/useIsEditing'
import { useOverlayStageTarget } from '../../../editor/canvas/useOverlayStageTarget'
import { OverlayCard } from '../../../editor/overlay-stage/OverlayCard'
import type { AdapterRenderProps } from '../../types'

const SIZE_CLASS: Record<ModalProps['size'], string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
  full: 'sm:max-w-[calc(100vw-2rem)]',
}

// Modal — editor renders into the right-side OverlayStage (portaled
// there so the canvas layout isn't disturbed). Runtime uses Radix
// Dialog, which portals to <body> with backdrop + esc + focus.
export function ShadcnModal({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { title, description, size, name, defaultOpen } = props as ModalProps
  const editing = useIsEditing()
  const state = useOverlayRuntime((s) => s.state)
  const setOpen = useOverlayRuntime((s) => s.set)
  const isOpen = readOverlayOpen(state, name, defaultOpen)
  const stageTarget = useOverlayStageTarget()

  if (editing) {
    if (!stageTarget) return null
    return createPortal(
      <OverlayCard label="Modal" name={name}>
        <div
          ref={rootRef as never}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={cn('relative w-full', SIZE_CLASS[size], className)}
          style={inlineStyle}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-accent"
          >
            <X size={14} aria-hidden />
          </button>
          <div className="space-y-1 pr-6">
            <div id="modal-title" className="text-lg font-semibold">
              {title}
            </div>
            {description && (
              <div className="text-sm text-muted-foreground">{description}</div>
            )}
          </div>
          <div className="mt-3">{children}</div>
        </div>
      </OverlayCard>,
      stageTarget,
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => setOpen(name, o)}>
      <DialogContent
        ref={rootRef as never}
        className={cn(SIZE_CLASS[size], className)}
        style={inlineStyle}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
