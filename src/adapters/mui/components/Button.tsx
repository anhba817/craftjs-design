import MuiButton from '@mui/material/Button'
import { useRef } from 'react'
import { EditableText } from '@design/sdk'
import type { ButtonProps } from '@/registry/components/button'
import { useStartTextEdit } from '@design/sdk'
import { useMuiTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

const INTENT_TO_COLOR = {
  primary: 'primary',
  secondary: 'secondary',
  destructive: 'error',
} as const

type Intent = keyof typeof INTENT_TO_COLOR

export function MaterialButton({
  props,
  rootRef,
  sx,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, intent, disabled, triggers } = props as ButtonProps
  const startEdit = useStartTextEdit()
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const { onClick, wrap } = useMuiTriggers(triggers, anchorRef)

  return wrap(
    <MuiButton
      ref={(el) => {
        anchorRef.current = el
        if (typeof rootRef === 'function')
          (rootRef as (el: HTMLButtonElement | null) => void)(el)
        else if (rootRef && 'current' in rootRef)
          (rootRef as React.MutableRefObject<HTMLButtonElement | null>).current = el
      }}
      variant="contained"
      color={INTENT_TO_COLOR[intent as Intent] ?? 'primary'}
      disabled={disabled}
      sx={sx}
      style={inlineStyle}
      onClick={onClick}
      onDoubleClick={(e: React.MouseEvent) => {
        e.stopPropagation()
        startEdit()
      }}
    >
      <EditableText text={label} propPath="label" />
    </MuiButton>,
  )
}
