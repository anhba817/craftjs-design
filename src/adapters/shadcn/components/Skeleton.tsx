import { cn } from '@/lib/utils'
import type { SkeletonProps } from '@/registry/components/skeleton'
import type { AdapterRenderProps } from '../../types'

// Skeleton (Phase 13 § 5.1) — pulsing placeholder. `variant` shapes the
// radius (text = small, rectangle = medium, circle = full); `width` /
// `height` are inline CSS lengths so the placeholder can match the real
// content's box.
export function ShadcnSkeleton({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { variant, width, height } = props as SkeletonProps
  const radius =
    variant === 'circle'
      ? 'rounded-full'
      : variant === 'text'
      ? 'rounded-sm'
      : 'rounded-md'
  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn(radius, className)}
      style={{ width, height, ...inlineStyle }}
    />
  )
}
