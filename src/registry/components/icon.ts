import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 27 — the `name` prop is now any (kebab-case) icon name, resolved at
// render time by the icon resolver (lazy lucide by default; host-pluggable via
// `registerIconResolver`). This list is no longer the allowlist — it stays as a
// curated *quick-pick / suggested* set (toolbox default, fast-access chips). All
// of these are valid lucide names, so documents authored against the old enum
// still validate and render unchanged.
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
  // Any icon name the active resolver understands (default: lucide kebab-case,
  // e.g. 'star', 'shopping-cart'). Unknown names render a fallback glyph.
  name: z.string(),
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
