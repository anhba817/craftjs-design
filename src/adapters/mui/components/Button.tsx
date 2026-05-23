import MuiButton from '@mui/material/Button'
import type { AdapterRenderProps } from '../../types'

const INTENT_TO_COLOR = {
  primary: 'primary',
  secondary: 'secondary',
  destructive: 'error',
} as const

type Intent = keyof typeof INTENT_TO_COLOR

// MUI components are forwardRef-wrapped internally, so unlike ShadcnButton we
// can pass `ref` directly without the `display: contents` span workaround.
// `rootRef as never` casts because MUI's ref type is HTMLButtonElement-specific;
// our editor-side callback uses the wider HTMLElement parameter.
export function MaterialButton({ props, rootRef, sx }: AdapterRenderProps) {
  const { label, intent, disabled } = props as {
    label: string
    intent: Intent
    disabled: boolean
  }
  return (
    <MuiButton
      ref={rootRef as never}
      variant="contained"
      color={INTENT_TO_COLOR[intent] ?? 'primary'}
      disabled={disabled}
      sx={sx}
    >
      {label}
    </MuiButton>
  )
}
