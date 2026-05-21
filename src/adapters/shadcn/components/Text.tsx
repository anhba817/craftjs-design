import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

export function ShadcnText({ props, style, rootRef }: AdapterRenderProps) {
  // The adapter contract uses Record<string, unknown> for props because it's
  // generic across components. Each impl narrows to its own canonical's shape.
  const { content } = props as { content: string }
  return (
    <p ref={rootRef} className={cn(style.classes.root)}>
      {content}
    </p>
  )
}
