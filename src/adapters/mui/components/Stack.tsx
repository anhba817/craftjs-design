import MuiStack from '@mui/material/Stack'
import type { AdapterRenderProps } from '../../types'

// MUI's Stack primitive natively accepts direction + spacing. The gap token
// from the canonical maps to MUI's spacing scale (numeric multiplier of 8px in
// the default theme).
const GAP_TO_SPACING: Record<string, number> = {
  '0': 0,
  '1': 1,
  '2': 2,
  '4': 4,
  '6': 6,
  '8': 8,
}

export function MaterialStack({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { direction, gap } = props as {
    direction: 'vertical' | 'horizontal'
    gap: string
  }
  return (
    <MuiStack
      ref={rootRef as never}
      direction={direction === 'vertical' ? 'column' : 'row'}
      spacing={GAP_TO_SPACING[gap] ?? 2}
      className={className}
      style={inlineStyle}
    >
      {children}
    </MuiStack>
  )
}
