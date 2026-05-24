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
export const cardPropsSchema = z.object({})
export type CardProps = z.infer<typeof cardPropsSchema>

registerComponent<CardProps>({
  id: 'card',
  category: 'layout',
  displayName: 'Card',
  tags: ['container', 'panel', 'box'],
  isCanvas: false,
  styleSlots: ['root', 'header', 'body', 'footer'],
  canvasSlots: ['header', 'body', 'footer'],
  propsSchema: cardPropsSchema,
  defaults: {
    props: {},
    style: {
      classes: { root: '', header: '', body: '', footer: '' },
    },
  },
})
