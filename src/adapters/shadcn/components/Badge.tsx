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
  // shadcn Badge is a plain function component (not forwardRef). Same span
  // wrapper pattern as ShadcnButton.
  return (
    <span ref={rootRef} style={{ display: 'contents' }}>
      <ShadcnBadgeImpl
        variant={INTENT_TO_VARIANT[intent] ?? 'default'}
        className={cn(className)}
        style={inlineStyle}
      >
        {label}
      </ShadcnBadgeImpl>
    </span>
  )
}
