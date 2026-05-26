import { Box } from '@chakra-ui/react'
import * as Lucide from 'lucide-react'
import type { ComponentType } from 'react'
import type { AdapterRenderProps } from '@design/sdk'

const SIZE_TO_PX: Record<string, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
}

// Icon canonical's `name` prop maps to a Lucide icon. Chakra has its own
// generic `Icon` primitive but the editor's icon library is Lucide, so we
// render the Lucide component directly inside a Chakra Box for sizing +
// className passthrough.
export function ChakraIconImpl({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { name, size } = props as { name: string; size: string }
  const pascal = name.charAt(0).toUpperCase() + name.slice(1)
  const LucideIcon = (Lucide as unknown as Record<string, ComponentType<{ size?: number }>>)[
    pascal
  ]
  const px = SIZE_TO_PX[size] ?? 16
  return (
    <Box
      ref={rootRef as never}
      display="inline-flex"
      className={className}
      style={inlineStyle}
    >
      {LucideIcon ? <LucideIcon size={px} /> : <span>{name}</span>}
    </Box>
  )
}
