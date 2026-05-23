import type { CSSProperties } from 'react'
import type { NodeStyle } from '@/registry/types'

// Reads NodeStyle.inline[slot] and returns it as React.CSSProperties (or
// undefined when there are no arbitrary values, so adapters that wrap their
// output in memo can skip a no-op style prop change).
//
// The stored shape is Record<string, string> (CSS-property camelCase keys →
// string values). React.CSSProperties allows numbers too; the cast is safe
// because we only ever store strings via the inspector.
//
// Phase 4.5 reads from style.inline (base breakpoint only). Phase 5+ will
// extend this to merge from style.responsive[bp].inline once that storage
// shape lands.
export function composeInlineStyle(
  style: NodeStyle,
  slot: string = 'root',
): CSSProperties | undefined {
  const inline = style.inline?.[slot]
  if (!inline || Object.keys(inline).length === 0) return undefined
  return inline as CSSProperties
}
