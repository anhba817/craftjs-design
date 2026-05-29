import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.1 — DataList is a `<dl>` canvas accepting DataListItems
// (each renders one `<dt>` / `<dd>` pair).
export const dataListPropsSchema = z.object({})
export type DataListProps = z.infer<typeof dataListPropsSchema>

registerComponent<DataListProps>({
  id: 'data-list',
  category: 'display',
  displayName: 'Data List',
  tags: ['dl', 'description-list', 'key-value', 'accepts:data-list-item'],
  isCanvas: true,
  styleSlots: ['root'],
  propsSchema: dataListPropsSchema,
  defaults: {
    props: {},
    style: {
      classes: {
        root: 'min-h-16 p-4 border border-dashed border-border rounded-md bg-card',
      },
    },
  },
})
