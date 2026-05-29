import { z } from 'zod'
import { registerComponent } from '../registry'

// Fixed list of icon names for Phase 5. Adapters import these explicitly from
// lucide-react to keep bundle size predictable. Phase 6+ can expand with
// dynamic imports or a runtime icon library.
export const ICON_NAMES = [
  'star',
  'heart',
  'home',
  'user',
  'settings',
  'mail',
  'phone',
  'search',
  'check',
  'x',
  'arrow-right',
  'arrow-down',
  'plus',
  'minus',
  'info',
  'alert-circle',
] as const
export type IconName = (typeof ICON_NAMES)[number]

export const iconPropsSchema = z.object({
  name: z.enum(ICON_NAMES),
  size: z.enum(['sm', 'base', 'lg', 'xl']),
  // Phase 13 § 5.3 — overlay trigger linking; same shape as Button.
  // The Triggers inspector panel writes here; the field is hidden from
  // the default PropsPanel.
  triggers: z.array(z.string()),
})
export type IconProps = z.infer<typeof iconPropsSchema>

registerComponent<IconProps>({
  id: 'icon',
  category: 'display',
  displayName: 'Icon',
  tags: ['glyph', 'svg', 'symbol'],
  isCanvas: false,
  styleSlots: ['root'],
  propsSchema: iconPropsSchema,
  defaults: {
    props: { name: 'star', size: 'base', triggers: [] },
    style: { classes: { root: 'text-foreground' } },
  },
  hiddenPropFields: ['triggers'],
})
