import Link from '@mui/material/Link'
import type { AdapterRenderProps } from '../../types'

export function MaterialLink({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { href, label, target } = props as {
    href: string
    label: string
    target: '_self' | '_blank'
  }
  return (
    <Link
      ref={rootRef as never}
      href={href}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={className}
      style={inlineStyle}
      onClick={(e) => e.preventDefault()}
    >
      {label}
    </Link>
  )
}
