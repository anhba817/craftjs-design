import { registerTheme } from './registry'

// Phase 12 § 4.12 — token-authored. Explicit light foreground for the
// same reason as the green theme.
registerTheme({
  id: 'blue',
  displayName: 'Blue',
  tokens: {
    primary: 'oklch(0.623 0.214 259.815)',
    primaryForeground: 'oklch(0.97 0.014 254.604)',
  },
})
