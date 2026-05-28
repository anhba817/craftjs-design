import {
  spacerSizeRem,
  type SpacerProps,
} from '@/registry/components/spacer'
import type { AdapterRenderProps } from '../../types'

// Spacer (Phase 13 § 5.5). A leaf div is the right primitive here — MUI
// has no dedicated spacer; rendering a styled div keeps parity with the
// shadcn implementation.
export function MaterialSpacer({
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
      className={className}
      style={{ ...dimension, ...inlineStyle }}
    />
  )
}
