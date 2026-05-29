import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 13 § 5.3 — Drawer (a.k.a. sheet, side panel). Pattern A canvas.
// Editing: inline panel with a side indicator. Runtime: shadcn <Sheet>
// or MUI <Drawer>, opened via a Button with `triggers: [drawer.name]`.
export const DRAWER_SIDES = ['left', 'right', 'top', 'bottom'] as const
export const DRAWER_SIZES = ['sm', 'md', 'lg'] as const

export const drawerPropsSchema = z.object({
  side: z.enum(DRAWER_SIDES),
  size: z.enum(DRAWER_SIZES),
  // Phase 13 § 5.3 — runtime trigger linking. Buttons reference this
  // name via `triggers` to open / close the drawer.
  name: z.string(),
  defaultOpen: z.boolean(),
})
export type DrawerProps = z.infer<typeof drawerPropsSchema>

registerComponent<DrawerProps>({
  id: 'drawer',
  category: 'feedback',
  displayName: 'Drawer',
  tags: ['overlay', 'sheet', 'side-panel'],
  // Phase 13 § 5.3 — created via right-click "Attach overlay → Drawer".
  hidden: true,
  isCanvas: true,
  styleSlots: ['root'],
  canResize: false,
  propsSchema: drawerPropsSchema,
  defaults: {
    props: {
      side: 'right',
      size: 'md',
      name: 'drawer',
      defaultOpen: false,
    },
    style: {
      classes: {
        root: 'h-full bg-popover p-4 border-l border-border shadow-lg',
      },
    },
  },
})
