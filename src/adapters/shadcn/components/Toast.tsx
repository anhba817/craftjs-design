import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@design/sdk'
import type { ToastProps } from '@/registry/components/toast'
import {
  readOverlayOpen,
  useOverlayRuntime,
} from '@design/sdk'
import { useIsEditing } from '@design/sdk'
import { useOverlayStageTarget } from '@design/sdk'
import { getScopedPortalRoot } from '@design/sdk'
import { OverlayCard } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

const INTENT_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
} as const

const INTENT_TINT = {
  info: 'text-foreground',
  success: 'text-green-700',
  warning: 'text-amber-700',
  error: 'text-red-700',
} as const

// Toast — editor portals a preview into the OverlayStage. Runtime
// portals to <body> at the bottom-right OS-toast slot.
export function ShadcnToast({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { title, description, intent, name, defaultOpen } = props as ToastProps
  const editing = useIsEditing()
  const state = useOverlayRuntime((s) => s.state)
  const setOpen = useOverlayRuntime((s) => s.set)
  const isOpen = readOverlayOpen(state, name, defaultOpen)
  const stageTarget = useOverlayStageTarget()
  const Icon = INTENT_ICON[intent]

  const body = (
    <>
      <Icon
        size={18}
        aria-hidden
        className={cn('mt-0.5 shrink-0', INTENT_TINT[intent])}
      />
      <div className="space-y-0.5 pr-5">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={editing ? undefined : () => setOpen(name, false)}
        className="absolute right-1 top-1 rounded p-1 text-muted-foreground hover:bg-accent"
      >
        <X size={12} aria-hidden />
      </button>
    </>
  )

  if (editing) {
    if (!stageTarget) return null
    return createPortal(
      <OverlayCard label="Toast" name={name}>
        <div
          ref={rootRef as never}
          role="status"
          aria-live="polite"
          className={cn('relative flex gap-2', className)}
          style={inlineStyle}
        >
          {body}
        </div>
      </OverlayCard>,
      stageTarget,
    )
  }

  if (!isOpen) return null

  return createPortal(
    <div
      ref={rootRef as never}
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-4 right-4 z-50 flex max-w-sm gap-2 rounded-md border bg-card p-3 shadow-lg',
        className,
      )}
      style={inlineStyle}
    >
      {body}
    </div>,
    getScopedPortalRoot(),
  )
}
