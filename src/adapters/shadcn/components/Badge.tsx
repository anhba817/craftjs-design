import { Badge as ShadcnBadgeImpl } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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
  const { label, intent } = props as { label: string; intent: Intent }
  // Phase 9 — React 19 forwards refs through plain function components, so
  // shadcn Badge gets the ref directly without a wrapper.
  return (
    <ShadcnBadgeImpl
      ref={rootRef as never}
      variant={INTENT_TO_VARIANT[intent] ?? 'default'}
      className={cn(className)}
      style={inlineStyle}
    >
      {label}
    </ShadcnBadgeImpl>
  )
}
