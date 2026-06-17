import { cn } from '@design/sdk'
import type { IconProps } from '@/registry/components/icon'
import { resolveIcon } from '@/icons/resolver'
import { useShadcnTriggers } from '../triggers'
import type { AdapterRenderProps } from '../../types'

const SIZE_PX: Record<string, number> = {
  sm: 16,
  base: 20,
  lg: 24,
  xl: 32,
}

export function ShadcnIcon({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { name, size, triggers } = props as IconProps
  const { onClick, wrap } = useShadcnTriggers(triggers)
  const hasTriggers = (triggers ?? []).length > 0
  // Icons are SVG elements; the span wraps them so Craft connectors attach
  // reliably and onClick fires from anywhere on the glyph (the SVG itself
  // doesn't always catch events on transparent pixels). The glyph is resolved
  // at render time (lazy lucide by default; host-pluggable) — see
  // @/icons/resolver.
  return wrap(
    <span
      ref={rootRef}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        cursor: hasTriggers ? 'pointer' : undefined,
        ...inlineStyle,
      }}
      className={cn(className)}
    >
      {resolveIcon(name, SIZE_PX[size] ?? 20)}
    </span>,
  )
}
