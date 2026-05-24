import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 7 — Tabs is multi-canvas via a DYNAMIC canvasSlots function: one
// canvas per `props.tabs` entry, prefixed `tab-` so the slot keys can't
// collide with the styleSlots ('root' / 'tabs' / 'content'). Each tab's
// content is dropped into the corresponding canvas by the adapter impl.
//
// Limitation: renaming a tab's `value` orphans the linked node for that
// tab's previous value. Designers see this as "I renamed the tab and its
// content disappeared." Phase 8 polish can add stable per-tab ids; for
// Phase 7 the trade-off is documented and the array editor's reorder
// preserves values, so renames are the only foot-gun.
export const tabsPropsSchema = z.object({
  tabs: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    }),
  ),
  defaultValue: z.string(),
})
export type TabsProps = z.infer<typeof tabsPropsSchema>

export const TAB_SLOT_PREFIX = 'tab-'

registerComponent<TabsProps>({
  id: 'tabs',
  category: 'navigation',
  displayName: 'Tabs',
  tags: ['nav', 'tabs', 'segmented'],
  isCanvas: false,
  styleSlots: ['root', 'tabs', 'content'],
  canvasSlots: (props) => {
    const tabs = (props as TabsProps).tabs ?? []
    return tabs.map((t) => `${TAB_SLOT_PREFIX}${t.value}`)
  },
  propsSchema: tabsPropsSchema,
  defaults: {
    props: {
      tabs: [
        { value: 'overview', label: 'Overview' },
        { value: 'details', label: 'Details' },
        { value: 'settings', label: 'Settings' },
      ],
      defaultValue: 'overview',
    },
    style: {
      classes: { root: '', tabs: '', content: '' },
    },
  },
})
