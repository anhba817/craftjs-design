import { z } from 'zod'
import { registerComponent } from '../registry'

// Pattern B canonical with three style slots: root (the Tabs container),
// tabs (the TabsList row of triggers), content (the active panel area). All
// tabs are props-driven for Phase 5 simplicity. ZodArray for `tabs` isn't
// editable in PropsPanel yet — defaults ship with 3 sensible tabs.
export const tabsPropsSchema = z.object({
  tabs: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      content: z.string(),
    }),
  ),
  defaultValue: z.string(),
})
export type TabsProps = z.infer<typeof tabsPropsSchema>

registerComponent<TabsProps>({
  id: 'tabs',
  category: 'navigation',
  displayName: 'Tabs',
  tags: ['nav', 'tabs', 'segmented'],
  isCanvas: false,
  styleSlots: ['root', 'tabs', 'content'],
  propsSchema: tabsPropsSchema,
  defaults: {
    props: {
      tabs: [
        { value: 'overview', label: 'Overview', content: 'Overview content.' },
        { value: 'details', label: 'Details', content: 'Details content.' },
        { value: 'settings', label: 'Settings', content: 'Settings content.' },
      ],
      defaultValue: 'overview',
    },
    style: {
      classes: { root: '', tabs: '', content: '' },
    },
  },
})
