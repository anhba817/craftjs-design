import MuiAvatar from '@mui/material/Avatar'
import type { AdapterRenderProps } from '../../types'

export function MaterialAvatar({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { src, alt, fallback } = props as {
    src: string
    alt: string
    fallback: string
  }
  return (
    <MuiAvatar
      ref={rootRef as never}
      src={src || undefined}
      alt={alt}
      className={className}
      style={inlineStyle}
    >
      {!src && fallback}
    </MuiAvatar>
  )
}
