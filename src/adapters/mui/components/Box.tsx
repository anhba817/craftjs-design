import MuiBox from '@mui/material/Box'
import type { AdapterRenderProps } from '../../types'

// MUI's <Box> is a styled-div primitive — no default visuals, accepts className
// and sx. Passing the canonical Tailwind className through keeps shadcn-style
// theme tokens (bg-card, border-border) working even when MUI is active —
// they're global CSS, not adapter-specific.
//
// The visual divergence between adapters happens at Button/Input where the
// libraries have genuinely different rendering models. Container components
// like Box are intentionally near-identical across adapters.
export function MaterialBox({ children, className, rootRef }: AdapterRenderProps) {
  return (
    <MuiBox ref={rootRef as never} className={className}>
      {children}
    </MuiBox>
  )
}
