import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.5 — Section. Semantic `<section>` wrapper. No visual chrome
// of its own beyond the layout-canonical dashed-border default (so a
// freshly-dropped Section is a visible drop zone). `ariaLabel` is optional
// and only emitted when non-empty so we don't pollute the accessibility
// tree with empty-label sections.
export const sectionPropsSchema = z.object({
  ariaLabel: z.string(),
})
export type SectionProps = z.infer<typeof sectionPropsSchema>

registerComponent<SectionProps>({
  id: 'section',
  category: 'layout',
  displayName: 'Section',
  tags: ['layout', 'semantic', 'landmark'],
  isCanvas: true,
  styleSlots: ['root'],
  propsSchema: sectionPropsSchema,
  defaults: {
    props: { ariaLabel: '' },
    style: {
      classes: {
        root: 'min-h-16 p-4 border border-dashed border-border rounded-md bg-card',
      },
    },
  },
})
