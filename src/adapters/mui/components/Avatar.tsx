import MuiAvatar from '@mui/material/Avatar'
import { useRef } from 'react'
import { cn } from '@design/sdk'
import type { AvatarProps } from '@/registry/components/avatar'
import { useMuiTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

export function MaterialAvatar({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { src, alt, fallback, triggers } = props as AvatarProps
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const { onClick, wrap } = useMuiTriggers(triggers, anchorRef)
  const hasTriggers = (triggers ?? []).length > 0
  return wrap(
    <MuiAvatar
      ref={(el) => {
        anchorRef.current = el as HTMLDivElement | null
        if (typeof rootRef === 'function')
          (rootRef as (el: HTMLDivElement | null) => void)(el as HTMLDivElement | null)
        else if (rootRef && 'current' in rootRef)
          (rootRef as React.MutableRefObject<HTMLDivElement | null>).current =
            el as HTMLDivElement | null
      }}
      src={src || undefined}
      alt={alt}
      onClick={onClick}
      className={cn(hasTriggers && 'cursor-pointer', className)}
      style={inlineStyle}
    >
      {!src && fallback}
    </MuiAvatar>,
  )
}
