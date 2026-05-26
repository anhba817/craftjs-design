import { Link } from '@chakra-ui/react'
import type { AdapterRenderProps } from '@design/sdk'

export function ChakraLinkImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { href, label, target } = props as {
    href: string
    label: string
    target: string
  }
  return (
    <Link
      ref={rootRef as never}
      href={href}
      target={target}
      className={className}
      style={inlineStyle}
      colorPalette="teal"
    >
      {label}
    </Link>
  )
}
