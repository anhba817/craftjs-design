import { z } from 'zod'
import { registerComponent } from '../registry'

export const badgePropsSchema = z.object({
  label: z.string(),
  intent: z.enum(['primary', 'secondary', 'destructive', 'outline']),
  // Phase 13 § 5.3 — overlay trigger linking; tooltips on badges
  // explaining status are a common pattern.
  triggers: z.array(z.string()),
})
export type BadgeProps = z.infer<typeof badgePropsSchema>

registerComponent<BadgeProps>({
  id: 'badge',
  category: 'display',
  displayName: 'Badge',
  tags: ['tag', 'pill', 'chip', 'status'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: badgePropsSchema,
  defaults: {
    props: { label: 'Badge', intent: 'primary', triggers: [] },
    style: { classes: { root: '' } },
  },
  // Badges don't have typography utilities that make sense at the Tailwind
  // level — their text styling is baked into shadcn's cva variants. Same
  // reasoning as Button.
  applicablePanels: [
    'spacing',
    'size',
    'appearance',
    'effects',
    'componentProps',
    'overlayTriggers',
  ],
  hiddenPropFields: ['triggers'],
})
