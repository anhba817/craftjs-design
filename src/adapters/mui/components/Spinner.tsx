import CircularProgress from '@mui/material/CircularProgress'
import type { SpinnerProps } from '@/registry/components/spinner'
import type { AdapterRenderProps } from '../../types'

// MUI Spinner — indeterminate CircularProgress. Size maps to MUI's
// numeric size prop (in px).
const SIZE_PX: Record<SpinnerProps['size'], number> = {
  sm: 16,
  base: 20,
  lg: 24,
  xl: 32,
}

export function MaterialSpinner({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { size } = props as SpinnerProps
  return (
    <CircularProgress
      ref={rootRef as never}
      size={SIZE_PX[size]}
      className={className}
      style={inlineStyle}
    />
  )
}
