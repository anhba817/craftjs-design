import { useNode } from '@craftjs/core'
import MuiButton from '@mui/material/Button'
import { EditableText } from '@/editor/text-edit/EditableText'
import { useEditorStore } from '@/state/editorStore'
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
export function MaterialButton({
  props,
  rootRef,
  sx,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, intent, disabled } = props as {
    label: string
    intent: Intent
    disabled: boolean
  }
  const { id } = useNode()
  const setEditingTextNode = useEditorStore((s) => s.setEditingTextNode)
  return (
    <MuiButton
      ref={rootRef as never}
      variant="contained"
      color={INTENT_TO_COLOR[intent] ?? 'primary'}
      disabled={disabled}
      sx={sx}
      style={inlineStyle}
      onDoubleClick={(e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingTextNode(id)
      }}
    >
      <EditableText text={label} propPath="label" />
    </MuiButton>
  )
}
