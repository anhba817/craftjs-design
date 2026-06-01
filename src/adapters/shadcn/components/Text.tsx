import { cn } from '@design/sdk'
import { EditableText } from '@design/sdk'
import { useStartTextEdit } from '@design/sdk'
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
  const startEdit = useStartTextEdit()

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
        startEdit()
      }}
    >
      <EditableText text={content} propPath="content" multiline />
    </p>
  )
}
