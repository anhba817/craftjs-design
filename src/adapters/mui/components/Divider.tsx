import Divider from '@mui/material/Divider'
import type { AdapterRenderProps } from '../../types'

export function MaterialDivider({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { orientation } = props as { orientation: 'horizontal' | 'vertical' }
  return (
    <Divider
      ref={rootRef as never}
      orientation={orientation}
      flexItem={orientation === 'vertical'}
      className={className}
      style={inlineStyle}
    />
  )
}
