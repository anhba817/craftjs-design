import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.1 — One `<dt>` / `<dd>` pair. The wrapping `<div>` is
// valid HTML5 inside `<dl>` and lets the adapter style each pair as a
// row (two-column grid).
export const dataListItemPropsSchema = z.object({
  term: z.string(),
  description: z.string(),
})
export type DataListItemProps = z.infer<typeof dataListItemPropsSchema>

registerComponent<DataListItemProps>({
  id: 'data-list-item',
  category: 'display',
  displayName: 'Data List Item',
  tags: ['dt', 'dd', 'key-value'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: dataListItemPropsSchema,
  defaults: {
    props: { term: 'Term', description: 'Description' },
    style: { classes: { root: '' } },
  },
})
