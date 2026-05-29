import { Badge as ShadcnBadgeImpl } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BadgeProps } from '@/registry/components/badge'
import { useShadcnTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

const INTENT_TO_VARIANT = {
  primary: 'default',
  secondary: 'secondary',
  destructive: 'destructive',
  outline: 'outline',
} as const

type Intent = keyof typeof INTENT_TO_VARIANT

export function ShadcnBadge({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, intent, triggers } = props as BadgeProps
  const { onClick, wrap } = useShadcnTriggers(triggers)
  const hasTriggers = (triggers ?? []).length > 0
  return wrap(
    <ShadcnBadgeImpl
      ref={rootRef as never}
      variant={INTENT_TO_VARIANT[intent as Intent] ?? 'default'}
      onClick={onClick}
      className={cn(hasTriggers && 'cursor-pointer', className)}
      style={inlineStyle}
    >
      {label}
    </ShadcnBadgeImpl>,
  )
}
