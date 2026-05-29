import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.3 — Modal. Pattern A canvas (children = modal body).
// Editing: inline-rendered bordered card with title / description on top.
// Runtime: shadcn <Dialog> / MUI <Dialog>, always open in v1 (a trigger
// button next to the modal is the host's responsibility).
export const MODAL_SIZES = ['sm', 'md', 'lg', 'full'] as const

export const modalPropsSchema = z.object({
  title: z.string(),
  description: z.string(),
  size: z.enum(MODAL_SIZES),
  // Phase 13 § 5.3 — Buttons reference this `name` via `triggers` to
  // open / close the modal at runtime. Should be unique per document.
  name: z.string(),
  // Whether the modal renders on initial page load (before any trigger
  // fires). Defaults to false — modals are usually closed at start.
  defaultOpen: z.boolean(),
})
export type ModalProps = z.infer<typeof modalPropsSchema>

registerComponent<ModalProps>({
  id: 'modal',
  category: 'feedback',
  displayName: 'Modal',
  tags: ['overlay', 'dialog', 'modal'],
  // Phase 13 § 5.3 — overlays don't appear in the toolbox. They are
  // created by right-clicking a trigger component and picking
  // "Attach overlay → Modal" from the context menu.
  hidden: true,
  isCanvas: true,
  styleSlots: ['root'],
  // Modal content is sized by its container at runtime; the editor
  // preview is a bordered card whose size doesn't translate to runtime
  // resizing.
  canResize: false,
  propsSchema: modalPropsSchema,
  defaults: {
    props: {
      title: 'Dialog title',
      description: 'A short description goes here.',
      size: 'md',
      name: 'modal',
      defaultOpen: false,
    },
    style: {
      classes: {
        root: 'rounded-lg border border-border bg-popover p-4 shadow-lg',
      },
    },
  },
})
