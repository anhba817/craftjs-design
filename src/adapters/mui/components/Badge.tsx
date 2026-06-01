import Chip from '@mui/material/Chip'
import { useRef } from 'react'
import { cn } from '@design/sdk'
import type { BadgeProps } from '@/registry/components/badge'
import { useMuiTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

// MUI's Chip is the rough equivalent of shadcn's Badge — slightly different
// visual but the same conceptual element.
const INTENT_TO_COLOR: Record<
  string,
  'primary' | 'secondary' | 'error' | 'default'
> = {
  primary: 'primary',
  secondary: 'secondary',
  destructive: 'error',
  outline: 'default',
}

const INTENT_TO_VARIANT: Record<string, 'filled' | 'outlined'> = {
  primary: 'filled',
  secondary: 'filled',
  destructive: 'filled',
  outline: 'outlined',
}

export function MaterialBadge({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, intent, triggers } = props as BadgeProps
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const { onClick, wrap } = useMuiTriggers(triggers, anchorRef)
  const hasTriggers = (triggers ?? []).length > 0
  return wrap(
    <Chip
      ref={(el) => {
        anchorRef.current = el as HTMLDivElement | null
        if (typeof rootRef === 'function')
          (rootRef as (el: HTMLDivElement | null) => void)(el as HTMLDivElement | null)
        else if (rootRef && 'current' in rootRef)
          (rootRef as React.MutableRefObject<HTMLDivElement | null>).current =
            el as HTMLDivElement | null
      }}
      label={label}
      color={INTENT_TO_COLOR[intent] ?? 'default'}
      variant={INTENT_TO_VARIANT[intent] ?? 'filled'}
      onClick={onClick}
      size="small"
      className={cn(hasTriggers && 'cursor-pointer', className)}
      style={inlineStyle}
    />,
  )
}
