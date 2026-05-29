import { cn } from '@/lib/utils'
import type { DataListItemProps } from '@/registry/components/data-list-item'
import type { AdapterRenderProps } from '../../types'

export function MaterialDataListItem({
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
