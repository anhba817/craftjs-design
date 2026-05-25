import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import MuiTabs from '@mui/material/Tabs'
import { TAB_SLOT_PREFIX, uniqueTabValues } from '@/registry/components/tabs'
import type { AdapterRenderProps } from '../../types'

// MUI Tabs is more imperative than Radix — there's no automatic content
// switching. We render the active tab's content based on `defaultValue` and
// freeze it (no-op onChange) in editor mode.
//
// Phase 9 — synthetic per-tab render values (see uniqueTabValues) keep the
// active-tab lookup stable when the user-authored `value` is empty or
// duplicated. Without these the active tab is ambiguous when multiple tabs
// share a value.
export function MaterialTabs({
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
  const renderValues = uniqueTabValues(tabs)
  const defaultIndex = Math.max(
    0,
    tabs.findIndex((t) => t.value === defaultValue),
  )
  const activeRenderValue = renderValues[defaultIndex] ?? renderValues[0]

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
          <Tab key={renderValues[i]} value={renderValues[i]} label={t.label} />
        ))}
      </MuiTabs>
      <Box
        className={composedClasses.content}
        style={composedInlineStyles.content}
        sx={{ p: 2 }}
      >
        {activeRenderValue &&
          slotChildren[`${TAB_SLOT_PREFIX}${activeRenderValue}`]}
      </Box>
    </Box>
  )
}
