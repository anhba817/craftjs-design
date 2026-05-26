import { useNode } from '@craftjs/core'
import Typography from '@mui/material/Typography'
import { EditableText } from '@/editor/text-edit/EditableText'
import { useEditorStore } from '@/state/editorStore'
import type { AdapterRenderProps } from '../../types'

export function MaterialHeading({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { level, content } = props as { level: '1' | '2' | '3' | '4' | '5' | '6'; content: string }
  const { id } = useNode()
  const setEditingTextNode = useEditorStore((s) => s.setEditingTextNode)
  return (
    <Typography
      ref={rootRef as never}
      variant={`h${level}` as const}
      component={`h${level}` as const}
      className={className}
      style={inlineStyle}
      onDoubleClick={(e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingTextNode(id)
      }}
    >
      <EditableText text={content} propPath="content" />
    </Typography>
  )
}
