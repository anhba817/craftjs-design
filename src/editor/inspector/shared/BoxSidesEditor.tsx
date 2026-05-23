import { useState } from 'react'
import { NumericInput } from './NumericInput'
import { ValueSelect } from './ValueSelect'

export type Side = 'top' | 'right' | 'bottom' | 'left'

export interface BoxSidesValue {
  shorthand?: string
  sides?: Partial<Record<Side, string>>
}

interface BoxSidesEditorProps {
  label: string
  value: BoxSidesValue
  options: readonly string[]
  // Receives a full replacement for the previous value. The caller translates
  // this back into slice patches — e.g., Spacing maps:
  //   shorthand:'4' → { p: '4', pt/pr/pb/pl: undefined }
  //   sides:{top:'2',right:'4'} → { p: undefined, pt: '2', pr: '4', pb: …, pl: … }
  onChange: (next: BoxSidesValue) => void
  // Phase 4.5: when set, linked-mode's NumericInput restricts arbitrary entry.
  // The unlinked per-side inputs are always token-only.
  arbitraryDisabledHint?: string
}

const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left'] as const
const SIDE_LABEL: Record<Side, string> = { top: 'T', right: 'R', bottom: 'B', left: 'L' }

// Linked-corners editor — used by Spacing for padding / margin.
//
// Linked mode (default when no per-side overrides): a single ValueSelect
// drives all four sides via a Tailwind shorthand (`p-4` rather than
// `pt-4 pr-4 pb-4 pl-4`).
//
// Unlinked mode: four ValueSelects, one per side.
//
// Switching modes redistributes the value: link → unlink propagates the
// shorthand to all four side fields; unlink → link picks the first defined
// side as the new shorthand.
//
// The link-state is local UI state (`useState`), not persisted. The
// AdapterProvider's "compose all Wrappers" pattern keeps this component
// mounted across adapter swaps so the user's link choice survives.
export function BoxSidesEditor({
  label,
  value,
  options,
  onChange,
  arbitraryDisabledHint,
}: BoxSidesEditorProps) {
  const hasSides = value.sides && SIDES.some((s) => value.sides?.[s])
  const [linked, setLinked] = useState(!hasSides)

  const link = () => {
    setLinked(true)
    const first = SIDES.map((s) => value.sides?.[s]).find((v) => v !== undefined)
    onChange({ shorthand: first, sides: undefined })
  }
  const unlink = () => {
    setLinked(false)
    const sh = value.shorthand
    if (sh === undefined) {
      onChange({ shorthand: undefined, sides: {} })
      return
    }
    onChange({
      shorthand: undefined,
      sides: { top: sh, right: sh, bottom: sh, left: sh },
    })
  }

  const setSide = (side: Side, v: string | undefined) => {
    const next: Partial<Record<Side, string>> = { ...value.sides }
    if (v === undefined) delete next[side]
    else next[side] = v
    onChange({ shorthand: undefined, sides: next })
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <button
          type="button"
          onClick={linked ? unlink : link}
          className="text-[10px] uppercase tracking-wide text-gray-500 hover:text-gray-700"
          aria-label={linked ? 'Unlink sides' : 'Link sides'}
        >
          {linked ? '⌗ linked' : '⌗ unlinked'}
        </button>
      </div>
      {linked ? (
        <NumericInput
          value={value.shorthand ?? ''}
          tokens={options}
          onChange={(v) => onChange({ shorthand: v === '' ? undefined : v, sides: undefined })}
          arbitraryDisabledHint={arbitraryDisabledHint}
        />
      ) : (
        // Unlinked per-side inputs are token-only in Phase 4.5. Per-side
        // arbitrary values would require inline `paddingTop`/`paddingRight`/…
        // mappings that complicate the panel without much UX value (the common
        // case for arbitrary is "set the same value all four sides"). Phase 5+
        // expands when the responsive arbitrary pipeline lands.
        <div className="grid grid-cols-2 gap-1.5">
          {SIDES.map((side) => (
            <div key={side} className="flex items-center gap-1">
              <span className="w-4 text-[10px] text-gray-500">{SIDE_LABEL[side]}</span>
              <ValueSelect
                value={value.sides?.[side] ?? ''}
                options={options}
                onChange={(v) => setSide(side, v)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
