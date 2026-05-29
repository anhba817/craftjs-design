import { cn } from '@/lib/utils'
import type { AdapterRenderProps } from '../../types'

// NavMenu — Pattern A canvas. Renders a <nav> with stacked children
// (NavItems). The canvas's own className carries the styling (border /
// padding / gap); the children handle their own layout.
export function ShadcnNavMenu({
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  return (
    <nav ref={rootRef as never} className={cn(className)} style={inlineStyle}>
      {children}
    </nav>
  )
}
