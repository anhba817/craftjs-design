import { createElement } from 'react'
import { cn } from '@design/sdk'
import { EditableText } from '@design/sdk'
import { useStartTextEdit } from '@design/sdk'
import type { AdapterRenderProps } from '../../types'

export function ShadcnHeading({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { level, content } = props as { level: string; content: string }
  const startEdit = useStartTextEdit()

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
        startEdit()
      },
    },
    <EditableText text={content} propPath="content" />,
  )
}
