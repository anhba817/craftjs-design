import { COLORS } from '@/style/tw-classes'
import type { TokenColor } from '@/style/tw-classes'

/**
 * @deprecated Use {@link ColorPicker} instead. Phase 4.5 replaced this with a
 * Popover-based picker supporting both token swatches and arbitrary hex values.
 * This file remains for any panel still using it during transition; remove it
 * once every panel has migrated.
 */
// Token color picker. A live swatch beside the select reflects the current
// value — native `<option>` elements can't render swatches reliably across
// browsers, so the swatch lives outside the dropdown.
//
// `options` defaults to the full COLORS set; pass a subset to filter per slot
// (e.g., a fill-color picker might exclude `border` / `input` / `ring`).
export function ColorSelect({
  value,
  options = COLORS,
  onChange,
}: {
  value: TokenColor | ''
  options?: readonly TokenColor[]
  onChange: (v: TokenColor | undefined) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        aria-hidden
        className="h-5 w-5 shrink-0 rounded border border-ed-border-2"
        // Empty value renders a transparent swatch; non-empty resolves through
        // the active theme's CSS variable cascade.
        style={{ backgroundColor: value ? `var(--${value})` : 'transparent' }}
      />
      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value === ''
              ? undefined
              : (e.target.value as TokenColor),
          )
        }
        className="w-full rounded border border-ed-border-2 bg-ed-surface px-1.5 py-1 text-sm text-ed-text"
      >
        <option value="">—</option>
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  )
}
