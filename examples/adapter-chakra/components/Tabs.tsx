import { Tabs } from '@chakra-ui/react'
import { tabSlotKeys, uniqueTabValues } from '@design/sdk'
import type { AdapterRenderProps } from '@design/sdk'

export function ChakraTabsImpl({
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
  // Phase 10 § 2.11 — slot keys come from tab.id; Chakra Tab value uses
  // uniqueTabValues for duplicate/empty safety.
  const slotKeys = tabSlotKeys(tabs)
  const renderValues = uniqueTabValues(tabs)
  const defaultIndex = Math.max(
    0,
    tabs.findIndex((t) => t.value === defaultValue),
  )
  const activeDefault = renderValues[defaultIndex] ?? renderValues[0]

  return (
    <Tabs.Root
      ref={rootRef as never}
      defaultValue={activeDefault}
      className={composedClasses.root}
      style={composedInlineStyles.root}
    >
      <Tabs.List
        className={composedClasses.tabs}
        style={composedInlineStyles.tabs}
      >
        {tabs.map((t, i) => (
          <Tabs.Trigger key={slotKeys[i]} value={renderValues[i]}>
            {t.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map((_, i) => (
        <Tabs.Content
          key={slotKeys[i]}
          value={renderValues[i]}
          className={composedClasses.content}
          style={composedInlineStyles.content}
        >
          {slotChildren[slotKeys[i]]}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
}
