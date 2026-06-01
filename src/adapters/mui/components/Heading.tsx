import Typography from '@mui/material/Typography'
import { EditableText } from '@design/sdk'
import { useStartTextEdit } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

export function MaterialHeading({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { level, content } = props as { level: '1' | '2' | '3' | '4' | '5' | '6'; content: string }
  const startEdit = useStartTextEdit()
  return (
    <Typography
      ref={rootRef as never}
      variant={`h${level}` as const}
      component={`h${level}` as const}
      className={className}
      style={inlineStyle}
      onDoubleClick={(e: React.MouseEvent) => {
        e.stopPropagation()
        startEdit()
      }}
    >
      <EditableText text={content} propPath="content" />
    </Typography>
  )
}
