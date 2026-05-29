import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import type { ProgressProps } from '@/registry/components/progress'
import type { AdapterRenderProps } from '../../types'

// MUI Progress — direct mapping to the library's primitives.
// Determinate variant so the editor preview matches `value`.
export function MaterialProgress({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { value, variant } = props as ProgressProps
  const clamped = Math.max(0, Math.min(100, value))
  if (variant === 'circular') {
    return (
      <CircularProgress
        ref={rootRef as never}
        variant="determinate"
        value={clamped}
        className={className}
        style={inlineStyle}
      />
    )
  }
  return (
    <LinearProgress
      ref={rootRef as never}
      variant="determinate"
      value={clamped}
      className={className}
      style={inlineStyle}
    />
  )
}
