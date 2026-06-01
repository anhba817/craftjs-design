import { Loader2 } from 'lucide-react'
import { cn } from '@design/sdk'
import type { SpinnerProps } from '@/registry/components/spinner'
import type { AdapterRenderProps } from '../../types'

// shadcn Spinner — lucide's Loader2 + Tailwind's animate-spin. Wrapped
// in a span so Craft connectors attach reliably (SVG events on
// transparent regions can be flaky on some browsers).
const SIZE_PX: Record<SpinnerProps['size'], number> = {
  sm: 16,
  base: 20,
  lg: 24,
  xl: 32,
}

export function ShadcnSpinner({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { size } = props as SpinnerProps
  return (
    <span
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={cn('inline-flex', className)}
      style={inlineStyle}
    >
      <Loader2 size={SIZE_PX[size]} className="animate-spin" />
    </span>
  )
}
