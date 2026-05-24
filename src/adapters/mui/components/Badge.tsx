import Chip from '@mui/material/Chip'
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
  const { label, intent } = props as { label: string; intent: string }
  return (
    <Chip
      ref={rootRef as never}
      label={label}
      color={INTENT_TO_COLOR[intent] ?? 'default'}
      variant={INTENT_TO_VARIANT[intent] ?? 'filled'}
      size="small"
      className={className}
      style={inlineStyle}
    />
  )
}
