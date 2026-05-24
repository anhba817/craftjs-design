import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import MuiTabs from '@mui/material/Tabs'
import type { AdapterRenderProps } from '../../types'

// MUI Tabs is more imperative than Radix — there's no automatic content
// switching. We render the active tab's content based on `defaultValue` and
// freeze it (no-op onChange) in editor mode.
export function MaterialTabs({
  props,
  rootRef,
  composedClasses = {},
  composedInlineStyles = {},
}: AdapterRenderProps) {
  const { tabs, defaultValue } = props as {
    tabs: { value: string; label: string; content: string }[]
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
        {active?.content}
      </Box>
    </Box>
  )
}
