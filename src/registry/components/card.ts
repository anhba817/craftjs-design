import { z } from 'zod'
import { registerComponent } from '../registry'

// Pattern B canonical with three CANVAS slots (header / body / footer) plus
// the styling-only `root` slot. Each canvas is independently droppable; users
// compose by dropping Text / Heading / Button etc. into the appropriate slot.
//
// `isCanvas` is FALSE — the outer Card is just a styled wrapper. Setting it
// true would create a competing drop target for the inner Element wrappers
// (the "competing drop targets break hit-testing" trap from Pattern A → B).
//
// `canvasSlots` only lists droppable regions; `root` is styling-only and is
// not a canvas. The inspector's SlotPicker exposes all four styleSlots for
// per-slot class editing.
export const cardPropsSchema = z.object({
  // Phase 13 § 5.3 — overlay trigger linking. Clicking a preview card
  // to open a detail modal is the common UX driving this.
  triggers: z.array(z.string()),
})
export type CardProps = z.infer<typeof cardPropsSchema>

registerComponent<CardProps>({
  id: 'card',
  category: 'layout',
  displayName: 'Card',
  tags: ['container', 'panel', 'box'],
  isCanvas: false,
  styleSlots: ['root', 'header', 'body', 'footer'],
  canvasSlots: ['header', 'body', 'footer'],
  // Card is `isCanvas: false`, so the default panel derivation omits the
  // Layout panel — yet each slot (root/header/body/footer) is a flex column
  // that benefits from display/align/justify/gap control. Opt in explicitly so
  // the inspector exposes Layout per slot via the SlotPicker; the adapter
  // wrappers already render `composedClasses[slot]`.
  applicablePanels: [
    'layout',
    'spacing',
    'size',
    'appearance',
    'effects',
    'typography',
    'componentProps',
  ],
  propsSchema: cardPropsSchema,
  defaults: {
    props: { triggers: [] },
    style: {
      classes: { root: '', header: '', body: '', footer: '' },
    },
  },
  hiddenPropFields: ['triggers'],
})
