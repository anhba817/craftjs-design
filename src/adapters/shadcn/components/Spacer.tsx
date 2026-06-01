import { cn } from '@design/sdk'
import {
  spacerSizeRem,
  type SpacerProps,
} from '@/registry/components/spacer'
import type { AdapterRenderProps } from '../../types'

// Spacer (Phase 13 § 5.5). A leaf that occupies room along one axis. The
// "other" dimension stays unset so the spacer can sit in any container
// without forcing a width/height. `flex-shrink: 0` on horizontal spacers
// stops a parent flex row from collapsing them.
export function ShadcnSpacer({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { size, axis } = props as SpacerProps
  const rem = spacerSizeRem(size)
  const dimension =
    axis === 'horizontal'
      ? { width: rem, flexShrink: 0 }
      : { height: rem }
  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn(className)}
      style={{ ...dimension, ...inlineStyle }}
    />
  )
}
