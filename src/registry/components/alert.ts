import { z } from 'zod'
import { registerComponent } from '../registry'

export const alertPropsSchema = z.object({
  intent: z.enum(['info', 'warning', 'error', 'success']),
  title: z.string(),
  description: z.string(),
})
export type AlertProps = z.infer<typeof alertPropsSchema>

// Pattern A: Alert is a single-slot canonical with intent + title + description
// as canonical props. Adapters render the icon + layout natively per their
// library's design (shadcn Alert, MUI Alert with severity). Pattern B with
// named slots (icon/title/description) was considered and rejected — the
// regions are too small and library-dependent for meaningful per-slot styling.
registerComponent<AlertProps>({
  id: 'alert',
  category: 'feedback',
  displayName: 'Alert',
  tags: ['notification', 'banner', 'message'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: alertPropsSchema,
  defaults: {
    props: { intent: 'info', title: 'Alert', description: 'Description' },
    style: { classes: { root: '' } },
  },
})
