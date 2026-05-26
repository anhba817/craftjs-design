import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import MuiTabs from '@mui/material/Tabs'
import { tabSlotKeys, uniqueTabValues } from '@/registry/components/tabs'
import type { AdapterRenderProps } from '../../types'

// MUI Tabs is more imperative than Radix — there's no automatic content
// switching. We render the active tab's content based on `defaultValue` and
// freeze it (no-op onChange) in editor mode.
//
// Phase 10 § 2.11 — slot keys come from `tab.id` via tabSlotKeys; the
// MUI Tab `value` prop still uses uniqueTabValues since the user-authored
// `value` field can still be empty or duplicated.
export function MaterialTabs({
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
  const slotKeys = tabSlotKeys(tabs)
  const renderValues = uniqueTabValues(tabs)
  const defaultIndex = Math.max(
    0,
    tabs.findIndex((t) => t.value === defaultValue),
  )
  const activeRenderValue = renderValues[defaultIndex] ?? renderValues[0]
  const activeSlotKey = slotKeys[defaultIndex] ?? slotKeys[0]

  return (
    <Box
      ref={rootRef as never}
      className={composedClasses.root}
      style={composedInlineStyles.root}
    >
      <MuiTabs
        value={activeRenderValue}
        onChange={() => {}}
        className={composedClasses.tabs}
        style={composedInlineStyles.tabs}
      >
        {tabs.map((t, i) => (
          <Tab key={slotKeys[i]} value={renderValues[i]} label={t.label} />
        ))}
      </MuiTabs>
      <Box
        className={composedClasses.content}
        style={composedInlineStyles.content}
        sx={{ p: 2 }}
      >
        {activeSlotKey && slotChildren[activeSlotKey]}
      </Box>
    </Box>
  )
}
