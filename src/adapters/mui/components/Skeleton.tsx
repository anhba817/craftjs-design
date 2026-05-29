import MuiSkeleton from '@mui/material/Skeleton'
import type { SkeletonProps } from '@/registry/components/skeleton'
import type { AdapterRenderProps } from '../../types'

// Skeleton — MUI ships a real Skeleton primitive (with its own wave /
// pulse animation). Map our `variant` to MUI's enum.
const VARIANT_MAP = {
  text: 'text',
  rectangle: 'rectangular',
  circle: 'circular',
} as const

export function MaterialSkeleton({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { variant, width, height } = props as SkeletonProps
  return (
    <MuiSkeleton
      ref={rootRef as never}
      variant={VARIANT_MAP[variant]}
      width={width}
      height={height}
      className={className}
      style={inlineStyle}
    />
  )
}
