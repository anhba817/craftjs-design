import { useNode } from '@craftjs/core'
import { cn } from '@/lib/utils'
import { EditableText } from '@/editor/text-edit/EditableText'
import { useEditorStore } from '@/state/editorStore'
import type { AdapterRenderProps } from '../../types'

export function ShadcnText({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  // The adapter contract uses Record<string, unknown> for props because it's
  // generic across components. Each impl narrows to its own canonical's shape.
  const { content } = props as { content: string }
  const { id } = useNode()
  const setEditingTextNode = useEditorStore((s) => s.setEditingTextNode)

  return (
    <p
      ref={rootRef}
      className={cn(className)}
      style={inlineStyle}
      onDoubleClick={(e) => {
        // Phase 11 § 3.11 — open inline edit on double-click. Stop
        // propagation so the canvas's own double-click handlers (if
        // any in future) don't fire on top.
        e.stopPropagation()
        setEditingTextNode(id)
      }}
    >
      <EditableText text={content} propPath="content" multiline />
    </p>
  )
}
