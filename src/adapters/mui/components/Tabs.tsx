import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import MuiTabs from '@mui/material/Tabs'
import { TAB_SLOT_PREFIX } from '@/registry/components/tabs'
import type { AdapterRenderProps } from '../../types'

// MUI Tabs is more imperative than Radix — there's no automatic content
// switching. We render the active tab's content based on `defaultValue` and
// freeze it (no-op onChange) in editor mode.
//
// Phase 7 multi-canvas: each tab's content lives in its own linked Craft
// canvas (keyed `tab-<value>`); we look up the active tab's slot wrapper
// from `slotChildren`.
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
  const active = tabs.find((t) => t.value === defaultValue) ?? tabs[0]
  return (
    <Box
      ref={rootRef as never}
      className={composedClasses.root}
      style={composedInlineStyles.root}
    >
      <MuiTabs
        value={defaultValue}
        onChange={() => {}}
        className={composedClasses.tabs}
        style={composedInlineStyles.tabs}
      >
        {tabs.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </MuiTabs>
      <Box
        className={composedClasses.content}
        style={composedInlineStyles.content}
        sx={{ p: 2 }}
      >
        {active && slotChildren[`${TAB_SLOT_PREFIX}${active.value}`]}
      </Box>
    </Box>
  )
}
