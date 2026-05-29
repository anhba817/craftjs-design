import MuiListItemButton from '@mui/material/ListItemButton'
import MuiListItemIcon from '@mui/material/ListItemIcon'
import MuiListItemText from '@mui/material/ListItemText'
import type { NavItemProps } from '@/registry/components/nav-item'
import { iconElement } from '../../_shared/lucide-icons'
import type { AdapterRenderProps } from '../../types'

// MUI NavItem — a ListItemButton wraps the visible row (the standard
// MUI menu item look: hover state, ripple, icon + text). Nested children
// (the optional submenu) render BELOW the button as a Craft canvas, so
// dropping another NavMenu / NavItems inside builds the nested level.
export function MaterialNavItem({
  props,
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  const { label, href, icon } = props as NavItemProps
  return (
    <div ref={rootRef} className={className} style={inlineStyle}>
      <MuiListItemButton component="a" href={href}>
        {icon ? (
          <MuiListItemIcon sx={{ minWidth: 32 }}>
            {iconElement(icon, 18)}
          </MuiListItemIcon>
        ) : null}
        <MuiListItemText primary={label} />
      </MuiListItemButton>
      {children}
    </div>
  )
}
