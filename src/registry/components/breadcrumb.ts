import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.2 — Breadcrumb. Leaf component with an items array (the
// PropsPanel uses ArrayField). Each item is { label, href? }; the
// adapter renders an ordered list inside a <nav> with separators.
export const breadcrumbPropsSchema = z.object({
  items: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
    }),
  ),
})
export type BreadcrumbProps = z.infer<typeof breadcrumbPropsSchema>

registerComponent<BreadcrumbProps>({
  id: 'breadcrumb',
  category: 'navigation',
  displayName: 'Breadcrumb',
  tags: ['nav', 'crumbs', 'path'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: breadcrumbPropsSchema,
  defaults: {
    props: {
      items: [
        { label: 'Home', href: '/' },
        { label: 'Section', href: '/section' },
        { label: 'Page', href: '' },
      ],
    },
    style: {
      classes: {
        root: 'flex items-center gap-1 text-sm text-muted-foreground',
      },
    },
  },
})
