import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.2 — NavItem. Pattern A canvas — its `children` becomes the
// optional submenu (drop another NavMenu / NavItems inside to nest). Props
// drive the visible label / link / icon for the item itself.
export const navItemPropsSchema = z.object({
  label: z.string(),
  href: z.string(),
  // Phase 27 — any resolver-known icon name, or '' for no icon (see icon.ts).
  icon: z.string(),
  // Phase 13 § 5.3 — overlay trigger linking. Tooltip on a collapsed
  // icon-only sidebar is the canonical example.
  triggers: z.array(z.string()),
})
export type NavItemProps = z.infer<typeof navItemPropsSchema>

registerComponent<NavItemProps>({
  id: 'nav-item',
  category: 'navigation',
  displayName: 'Nav Item',
  tags: ['nav', 'link', 'menu-item'],
  isCanvas: true,
  styleSlots: ['root'],
  propsSchema: navItemPropsSchema,
  defaults: {
    props: { label: 'Item', href: '#', icon: '', triggers: [] },
    style: {
      classes: {
        root: 'rounded px-3 py-1.5 text-sm text-foreground hover:bg-accent',
      },
    },
  },
  hiddenPropFields: ['triggers'],
})
