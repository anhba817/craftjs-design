import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { tabSlotKeys, uniqueTabValues } from '@/registry/components/tabs'
import type { AdapterRenderProps } from '../../types'

export function ShadcnTabs({
  props,
  rootRef,
  composedClasses = {},
  composedInlineStyles = {},
  slotChildren = {},
}: AdapterRenderProps) {
  const { tabs, defaultValue } = props as {
    tabs: { id?: string; value: string; label: string }[]
    defaultValue: string
  }

  // Phase 10 § 2.11 — slot keys come from `tab.id` via tabSlotKeys; the
  // Radix `value` prop still uses `uniqueTabValues` since the user-authored
  // `value` field can still be empty or duplicated.
  const slotKeys = tabSlotKeys(tabs)
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
          <TabsTrigger key={slotKeys[i]} value={renderValues[i]}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((_, i) => (
        <TabsContent
          key={slotKeys[i]}
          value={renderValues[i]}
          className={cn(composedClasses.content)}
          style={composedInlineStyles.content}
        >
          {slotChildren[slotKeys[i]]}
        </TabsContent>
      ))}
    </Tabs>
  )
}
