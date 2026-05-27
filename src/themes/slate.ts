import { registerTheme } from './registry'

// Phase 12 § 4.12 — a cool-gray base theme. The dark primary lets the
// contrast heuristic derive its (light) foreground; the cool tints on
// secondary/muted/border/ring give the theme its slate character.
registerTheme({
  id: 'slate',
  displayName: 'Slate',
  tokens: {
    primary: 'oklch(0.208 0.042 265.755)',
    secondary: 'oklch(0.968 0.007 247.896)',
    muted: 'oklch(0.968 0.007 247.896)',
    mutedForeground: 'oklch(0.554 0.046 257.417)',
    border: 'oklch(0.929 0.013 255.508)',
    ring: 'oklch(0.704 0.04 256.788)',
  },
  // Dark variant — a light slate primary on the dark neutrals (mirrors the
  // shadcn dark base color where primary inverts to near-white).
  darkTokens: {
    primary: 'oklch(0.929 0.013 255.508)',
    primaryForeground: 'oklch(0.208 0.042 265.755)',
    ring: 'oklch(0.551 0.027 264.364)',
  },
})
