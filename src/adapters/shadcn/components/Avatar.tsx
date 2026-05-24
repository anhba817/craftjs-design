import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

export function ShadcnAvatar({
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
    <span ref={rootRef} style={{ display: 'contents' }}>
      <Avatar className={cn(className)} style={inlineStyle}>
        {src && <AvatarImage src={src} alt={alt} />}
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    </span>
  )
}
