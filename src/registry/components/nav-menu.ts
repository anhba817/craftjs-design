import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.2 — NavMenu. Pattern A canvas accepting NavItem children
// (the rule is documented in tags; enforcement via an `accepts` field is
// deferred). Renders a vertical <nav> wrapper; the user composes the
// menu by dropping NavItems inside.
export const navMenuPropsSchema = z.object({})
export type NavMenuProps = z.infer<typeof navMenuPropsSchema>

registerComponent<NavMenuProps>({
  id: 'nav-menu',
  category: 'navigation',
  displayName: 'Nav Menu',
  tags: ['nav', 'menu', 'sidebar', 'accepts:nav-item'],
  isCanvas: true,
  styleSlots: ['root'],
  propsSchema: navMenuPropsSchema,
  defaults: {
    props: {},
    style: {
      classes: {
        root: 'flex flex-col gap-1 p-2 min-h-16 border border-dashed border-border rounded-md bg-card',
      },
    },
  },
})
