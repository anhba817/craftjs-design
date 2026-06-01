import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Info, AlertTriangle, CircleAlert, CircleCheck, X } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@design/sdk'
import type { AlertProps } from '@/registry/components/alert'
import {
  readOverlayOpen,
  useOverlayRuntime,
} from '@design/sdk'
import { useIsEditing } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

const INTENT_TO_VARIANT: Record<string, 'default' | 'destructive'> = {
  info: 'default',
  warning: 'default',
  success: 'default',
  error: 'destructive',
}

const INTENT_ICON: Record<string, ComponentType<{ className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  error: CircleAlert,
  success: CircleCheck,
}

// Alert — editor always renders. Runtime renders when open per the
// overlay runtime store (defaultOpen: true makes alerts persist by
// default, unlike modals / drawers). A dismiss X calls the store to
// close.
export function ShadcnAlert({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { intent, title, description, name, defaultOpen } = props as AlertProps
  const editing = useIsEditing()
  const state = useOverlayRuntime((s) => s.state)
  const setOpen = useOverlayRuntime((s) => s.set)
  const isOpen = readOverlayOpen(state, name, defaultOpen)
  if (!editing && !isOpen) return null

  const Icon = INTENT_ICON[intent] ?? Info
  return (
    <Alert
      ref={rootRef as never}
      variant={INTENT_TO_VARIANT[intent] ?? 'default'}
      className={cn('relative', className)}
      style={inlineStyle}
    >
      <Icon className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={editing ? undefined : () => setOpen(name, false)}
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-accent"
      >
        <X size={12} aria-hidden />
      </button>
    </Alert>
  )
}
