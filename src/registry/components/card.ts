import { z } from 'zod'
import { registerComponent } from '../registry'

// Pattern B canonical: declares four style slots (root + header + body +
// footer). Inspector's SlotPicker exposes them as a pill bar; the active
// slot's class string flows into style.classes[slot] and gets composed by
// CanonicalNode into composedClasses[slot].
//
// isCanvas: true — children dropped on the Card land inside `body`. The
// header and footer are props-driven (text only) for Phase 5 simplicity;
// Phase 6+ can introduce multi-canvas regions if richer composition becomes
// a real requirement.
export const cardPropsSchema = z.object({
  title: z.string(),
  description: z.string(),
  showFooter: z.boolean(),
  footerText: z.string(),
})
export type CardProps = z.infer<typeof cardPropsSchema>

registerComponent<CardProps>({
  id: 'card',
  category: 'layout',
  displayName: 'Card',
  tags: ['container', 'panel', 'box'],
  isCanvas: true,
  styleSlots: ['root', 'header', 'body', 'footer'],
  propsSchema: cardPropsSchema,
  defaults: {
    props: {
      title: 'Card title',
      description: 'Card description',
      showFooter: false,
      footerText: 'Footer',
    },
    style: {
      classes: { root: '', header: '', body: '', footer: '' },
    },
  },
})
