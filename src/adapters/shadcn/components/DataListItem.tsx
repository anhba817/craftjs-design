import { cn } from '@/lib/utils'
import type { DataListItemProps } from '@/registry/components/data-list-item'
import type { AdapterRenderProps } from '../../types'

// DataListItem — one `<dt>` / `<dd>` pair. The wrapping `<div>` is valid
// HTML5 inside `<dl>` (since 2014) and lets us style the pair as a row
// without losing the semantic dt/dd association.
export function ShadcnDataListItem({
  props,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { term, description } = props as DataListItemProps
  return (
    <div
      ref={rootRef}
      className={cn('flex gap-3 text-sm', className)}
      style={inlineStyle}
    >
      <dt className="font-medium text-foreground">{term}</dt>
      <dd className="text-muted-foreground">{description}</dd>
    </div>
  )
}
