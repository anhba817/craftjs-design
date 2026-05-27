import { registerTheme } from './registry'

// Phase 12 § 4.12 — authored via the token API (deriveTokens fills the
// rest). The saturated primary needs an explicit light foreground; its
// high oklch lightness would otherwise trip the contrast heuristic into
// picking dark text.
registerTheme({
  id: 'green',
  displayName: 'Green',
  tokens: {
    primary: 'oklch(0.723 0.219 149.579)',
    primaryForeground: 'oklch(0.982 0.018 155.826)',
  },
})
