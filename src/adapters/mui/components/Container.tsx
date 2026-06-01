import MuiBox from '@mui/material/Box'
import { cn } from '@design/sdk'
import {
  containerMaxWidth,
  type ContainerProps,
} from '@/registry/components/container'
import type { AdapterRenderProps } from '../../types'

// Container (Phase 13 § 5.5). MUI ships its own `<Container>` but with a
// different maxWidth scale (xs/sm/md/lg/xl); rendering a plain MUI Box
// with the canonical's tokens keeps both adapters on identical breakpoint
// math.
export function MaterialContainer({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { maxWidth } = props as ContainerProps
  return (
    <MuiBox
      ref={rootRef as never}
      className={cn(className)}
      style={{
        marginInline: 'auto',
        maxWidth: containerMaxWidth(maxWidth),
        ...inlineStyle,
      }}
    >
      {children}
    </MuiBox>
  )
}
