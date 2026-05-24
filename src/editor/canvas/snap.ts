// Pure snap helper for ResizeOverlay. Given a rendered pixel value, returns
// the closest Tailwind size token within tolerance (or null when no token
// is close enough). The numeric SIZE_VALUES in src/style/tw-classes.ts are
// Tailwind's spacing-scale integers (`w-32` etc.); each scale unit equals
// 0.25rem, which at the default 16px root font size = 4px per unit.
//
// We hard-code the 16px root font assumption — the editor renders inside the
// shadcn-themed shell, which inherits browser defaults. Designers whose
// integration host uses a non-default root font lose the snap precision,
// but the snap is a UX nicety, not load-bearing.

// Subset of SIZE_VALUES that maps cleanly to pixels — skips `auto`, `full`,
// and fractionals (`1/2`, `1/3`, etc.) since those are layout-relative and
// can't be compared to a rendered px count.
const TOKEN_TO_PX: Record<string, number> = {
  '0': 0,
  '8': 32, // 8  × 0.25rem ×16
  '12': 48,
  '16': 64,
  '24': 96,
  '32': 128,
  '48': 192,
  '64': 256,
  '96': 384,
  '128': 512,
}

export const SNAP_TOLERANCE_PX = 4

/**
 * Returns the closest matching Tailwind size token (`'32'`, `'48'`, …) when
 * the input pixel value is within SNAP_TOLERANCE_PX of any token. Returns
 * null when nothing's close enough — the caller keeps the px value as inline
 * style.
 */
export function snapToSizeToken(px: number): string | null {
  let best: string | null = null
  let bestDistance = SNAP_TOLERANCE_PX + 1
  for (const [token, tokenPx] of Object.entries(TOKEN_TO_PX)) {
    const distance = Math.abs(px - tokenPx)
    if (distance <= SNAP_TOLERANCE_PX && distance < bestDistance) {
      bestDistance = distance
      best = token
    }
  }
  return best
}
