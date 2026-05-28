import type { SectionProps } from '@/registry/components/section'
import type { AdapterRenderProps } from '../../types'

// Section (Phase 13 § 5.5). The HTML `<section>` element is the right
// primitive — MUI offers no semantic-landmark wrapper of its own.
export function MaterialSection({
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
      className={className}
      style={inlineStyle}
    >
      {children}
    </section>
  )
}
