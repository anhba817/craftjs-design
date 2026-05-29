import MuiListItemButton from '@mui/material/ListItemButton'
import MuiListItemIcon from '@mui/material/ListItemIcon'
import MuiListItemText from '@mui/material/ListItemText'
import { useRef } from 'react'
import type { NavItemProps } from '@/registry/components/nav-item'
import { iconElement } from '../../_shared/lucide-icons'
import { useMuiTriggers } from '../triggers'
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
  const { label, href, icon, triggers } = props as NavItemProps
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const { onClick: triggersOnClick, wrap } = useMuiTriggers(triggers, anchorRef)

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault()
    triggersOnClick?.()
  }

  return wrap(
    <div
      ref={(el) => {
        anchorRef.current = el
        if (typeof rootRef === 'function')
          (rootRef as (el: HTMLDivElement | null) => void)(el)
        else if (rootRef && 'current' in rootRef)
          (rootRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      }}
      className={className}
      style={inlineStyle}
    >
      <MuiListItemButton component="a" href={href} onClick={handleClick}>
        {icon ? (
          <MuiListItemIcon sx={{ minWidth: 32 }}>
            {iconElement(icon, 18)}
          </MuiListItemIcon>
        ) : null}
        <MuiListItemText primary={label} />
      </MuiListItemButton>
      {children}
    </div>,
  )
}
