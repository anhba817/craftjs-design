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
  darkTokens: {
    primary: 'oklch(0.546 0.245 262.881)',
    primaryForeground: 'oklch(0.379 0.146 265.522)',
  },
})
