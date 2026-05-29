import MuiLink from '@mui/material/Link'
import { useRef } from 'react'
import type { LinkProps } from '@/registry/components/link'
import { useMuiTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

export function MaterialLink({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { href, label, target, triggers } = props as LinkProps
  const anchorRef = useRef<HTMLAnchorElement | null>(null)
  const { onClick: triggersOnClick, wrap } = useMuiTriggers(triggers, anchorRef)

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault()
    triggersOnClick?.()
  }

  return wrap(
    <MuiLink
      ref={(el) => {
        anchorRef.current = el
        if (typeof rootRef === 'function')
          (rootRef as (el: HTMLAnchorElement | null) => void)(el)
        else if (rootRef && 'current' in rootRef)
          (rootRef as React.MutableRefObject<HTMLAnchorElement | null>).current = el
      }}
      href={href}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={className}
      style={inlineStyle}
      onClick={handleClick}
    >
      {label}
    </MuiLink>,
  )
}
