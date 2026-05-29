import MuiList from '@mui/material/List'
import type { AdapterRenderProps } from '../../types'

// MUI NavMenu — a <List> is the right MUI primitive for a vertical
// navigation menu. NavItems drop in as children (rendered as MUI
// ListItemButtons).
export function MaterialNavMenu({
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  return (
    <MuiList
      ref={rootRef as never}
      component="nav"
      className={className}
      style={inlineStyle}
      dense
    >
      {children}
    </MuiList>
  )
}
