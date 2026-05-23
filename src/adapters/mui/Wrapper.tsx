import { ThemeProvider } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { muiTheme } from './theme'

// The `.mui-bridge` wrapper sets CSS custom property overrides that point
// MUI's generated palette variables (--mui-palette-primary-main, etc.) at our
// shadcn tokens (--primary, etc.). display:contents keeps the wrapper layout-
// transparent so the canvas's flex sizing isn't disturbed. See the matching
// block in src/index.css.
//
// No CssBaseline — it would reset shadcn's base styles globally. MUI's
// components ship their own internal resets.
export function MuiWrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={muiTheme}>
      <div className="mui-bridge" style={{ display: 'contents' }}>
        {children}
      </div>
    </ThemeProvider>
  )
}
