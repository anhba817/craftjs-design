import { registerTheme } from './registry'

// Phase 12 § 4.12 — a warm-gray base theme. Same shape as slate with
// zinc's subtler, slightly warmer neutral tints.
registerTheme({
  id: 'zinc',
  displayName: 'Zinc',
  tokens: {
    primary: 'oklch(0.21 0.006 285.885)',
    secondary: 'oklch(0.967 0.001 286.375)',
    muted: 'oklch(0.967 0.001 286.375)',
    mutedForeground: 'oklch(0.552 0.016 285.938)',
    border: 'oklch(0.92 0.004 286.32)',
    ring: 'oklch(0.705 0.015 286.067)',
  },
})
