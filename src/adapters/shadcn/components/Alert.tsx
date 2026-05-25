import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Info, AlertTriangle, CircleAlert, CircleCheck } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

// shadcn's Alert variants ship with `default` and `destructive`. We map our
// canonical intent enum to those + use Lucide icons for visual cues.
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

export function ShadcnAlert({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { intent, title, description } = props as {
    intent: 'info' | 'warning' | 'error' | 'success'
    title: string
    description: string
  }
  const Icon = INTENT_ICON[intent] ?? Info
  return (
    <Alert
      ref={rootRef as never}
      variant={INTENT_TO_VARIANT[intent] ?? 'default'}
      className={cn(className)}
      style={inlineStyle}
    >
      <Icon className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  )
}
