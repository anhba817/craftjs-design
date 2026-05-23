import { createTheme } from '@mui/material/styles'

// MUI's palette validator rejects `var(--...)` strings at createTheme time —
// `cssVariables: true` generates MUI's OWN CSS variables from real color
// values; it doesn't accept CSS-variable references as input.
//
// Workaround:
//   1. Pass valid placeholder colors here (these become the FALLBACK if the
//      cascade override fails to load).
//   2. Override MUI's generated `--mui-palette-*` variables to reference our
//      shadcn tokens — see the `.mui-bridge` block in src/index.css.
//
// The placeholder values below approximate shadcn's neutral defaults so the
// UI doesn't look wildly broken if the bridge stylesheet is missing.
export const muiTheme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: '#0a0a0a', contrastText: '#fafafa' },
    secondary: { main: '#f5f5f5', contrastText: '#0a0a0a' },
    error: { main: '#ef4444' },
    background: { default: '#ffffff', paper: '#ffffff' },
    text: { primary: '#0a0a0a', secondary: '#737373' },
  },
})
