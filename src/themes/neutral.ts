import { registerTheme } from './registry'

// Phase 12 § 4.12 — a pure-gray base theme (no hue). The smallest token
// set of the built-ins: just the primary plus the neutral muted/ring
// values, everything else derived.
registerTheme({
  id: 'neutral',
  displayName: 'Neutral',
  tokens: {
    primary: 'oklch(0.205 0 0)',
    mutedForeground: 'oklch(0.556 0 0)',
    ring: 'oklch(0.708 0 0)',
  },
})
