import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.3 — Toast. Leaf. Editing: inline notification card.
// Runtime: shadcn / MUI's toast primitive (or a portaled equivalent);
// v1 also renders inline at runtime so no Toaster context is required.
export const TOAST_INTENTS = ['info', 'success', 'warning', 'error'] as const

export const toastPropsSchema = z.object({
  title: z.string(),
  description: z.string(),
  intent: z.enum(TOAST_INTENTS),
  // Phase 13 § 5.3 — runtime trigger linking. Buttons reference this
  // name via `triggers` to show / dismiss the toast.
  name: z.string(),
  defaultOpen: z.boolean(),
})
export type ToastProps = z.infer<typeof toastPropsSchema>

registerComponent<ToastProps>({
  id: 'toast',
  category: 'feedback',
  displayName: 'Toast',
  tags: ['overlay', 'notification', 'snackbar'],
  // Phase 13 § 5.3 — created via right-click "Attach overlay → Toast".
  hidden: true,
  isCanvas: false,
  styleSlots: ['root'],
  canResize: false,
  propsSchema: toastPropsSchema,
  defaults: {
    props: {
      title: 'Saved',
      description: 'Your changes were saved successfully.',
      intent: 'success',
      name: 'toast',
      defaultOpen: false,
    },
    style: {
      classes: {
        root: 'inline-flex max-w-sm items-start gap-3 rounded-md border border-border bg-popover p-3 shadow-md',
      },
    },
  },
})
