import { cn } from '@/lib/utils'
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
  return (
    <p ref={rootRef} className={cn(className)} style={inlineStyle}>
      {content}
    </p>
  )
}
