import { cn } from '@/lib/utils'
import type { SectionProps } from '@/registry/components/section'
import type { AdapterRenderProps } from '../../types'

// Section (Phase 13 § 5.5). Semantic `<section>` wrapper. `aria-label` is
// only emitted when non-empty so we don't pollute the a11y tree with
// nameless landmarks.
export function ShadcnSection({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { ariaLabel } = props as SectionProps
  return (
    <section
      ref={rootRef as never}
      aria-label={ariaLabel || undefined}
      className={cn(className)}
      style={inlineStyle}
    >
      {children}
    </section>
  )
}
