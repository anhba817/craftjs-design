import { useNode } from '@craftjs/core'
import { createElement } from 'react'
import { cn } from '@/lib/utils'
import { EditableText } from '@/editor/text-edit/EditableText'
import { useEditorStore } from '@/state/editorStore'
import type { AdapterRenderProps } from '../../types'

export function ShadcnHeading({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { level, content } = props as { level: string; content: string }
  const { id } = useNode()
  const setEditingTextNode = useEditorStore((s) => s.setEditingTextNode)

  // Dynamic `h${level}` via createElement — keeps the impl single-file without
  // a six-way if/else. Single-line edit (Enter commits, no newline).
  return createElement(
    `h${level}`,
    {
      ref: rootRef,
      className: cn(className),
      style: inlineStyle,
      onDoubleClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingTextNode(id)
      },
    },
    <EditableText text={content} propPath="content" />,
  )
}
