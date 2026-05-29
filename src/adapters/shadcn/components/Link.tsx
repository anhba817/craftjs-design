import { cn } from '@/lib/utils'
import type { LinkProps } from '@/registry/components/link'
import { useShadcnTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

export function ShadcnLink({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { href, label, target, triggers } = props as LinkProps
  const { onClick: triggersOnClick, wrap } = useShadcnTriggers(triggers)

  // preventDefault keeps the editor from navigating off-canvas; trigger
  // handlers still fire so tooltip / popover / modal behavior works
  // even when href is set.
  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault()
    triggersOnClick?.()
  }

  return wrap(
    <a
      ref={rootRef as never}
      href={href}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={cn(className)}
      style={inlineStyle}
      onClick={handleClick}
    >
      {label}
    </a>,
  )
}
