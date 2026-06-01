import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@design/sdk'
import type { AvatarProps } from '@/registry/components/avatar'
import { useShadcnTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

export function ShadcnAvatar({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { src, alt, fallback, triggers } = props as AvatarProps
  const { onClick, wrap } = useShadcnTriggers(triggers)
  const hasTriggers = (triggers ?? []).length > 0
  return wrap(
    <Avatar
      ref={rootRef as never}
      onClick={onClick}
      className={cn(hasTriggers && 'cursor-pointer', className)}
      style={inlineStyle}
    >
      {src && <AvatarImage src={src} alt={alt} />}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>,
  )
}
