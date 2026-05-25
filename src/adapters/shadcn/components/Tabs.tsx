import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { TAB_SLOT_PREFIX, uniqueTabValues } from '@/registry/components/tabs'
import type { AdapterRenderProps } from '../../types'

export function ShadcnTabs({
  props,
  rootRef,
  composedClasses = {},
  composedInlineStyles = {},
  slotChildren = {},
}: AdapterRenderProps) {
  const { tabs, defaultValue } = props as {
    tabs: { value: string; label: string }[]
    defaultValue: string
  }

  // Synthetic per-tab render values — see uniqueTabValues' docstring. Without
  // these, multiple tabs with duplicate or empty `value` (e.g., freshly-added
  // tabs from the PropsPanel "+Add" button default to value="") collide in
  // Radix's panel switching and all their content panels render at once.
  const renderValues = uniqueTabValues(tabs)
  const defaultIndex = Math.max(
    0,
    tabs.findIndex((t) => t.value === defaultValue),
  )
  const activeDefault = renderValues[defaultIndex] ?? renderValues[0]

  return (
    <Tabs
      ref={rootRef as never}
      defaultValue={activeDefault}
      className={cn(composedClasses.root)}
      style={composedInlineStyles.root}
    >
      <TabsList
        className={cn(composedClasses.tabs)}
        style={composedInlineStyles.tabs}
      >
        {tabs.map((t, i) => (
          <TabsTrigger key={renderValues[i]} value={renderValues[i]}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((_, i) => (
        <TabsContent
          key={renderValues[i]}
          value={renderValues[i]}
          className={cn(composedClasses.content)}
          style={composedInlineStyles.content}
        >
          {slotChildren[`${TAB_SLOT_PREFIX}${renderValues[i]}`]}
        </TabsContent>
      ))}
    </Tabs>
  )
}
