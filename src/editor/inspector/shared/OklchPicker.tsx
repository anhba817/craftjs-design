import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatOklch, parseOklch, type Oklch } from './color-conversions'

// Phase 12 § 4.10 — OKLCH slider picker for the theme editor. The swatch
// button opens a popover with Lightness / Chroma / Hue sliders; moving any
// slider commits `oklch(L C H)` via onChange. When the current value isn't
// parseable oklch (empty / "auto" / a hex), the sliders seed from a neutral
// default and only emit once the user actually drags one.
const DEFAULT_OKLCH: Oklch = { l: 0.6, c: 0.12, h: 250 }

const SLIDERS: {
  key: keyof Oklch
  label: string
  min: number
  max: number
  step: number
}[] = [
  { key: 'l', label: 'Lightness', min: 0, max: 1, step: 0.005 },
  { key: 'c', label: 'Chroma', min: 0, max: 0.4, step: 0.005 },
  { key: 'h', label: 'Hue', min: 0, max: 360, step: 1 },
]

export function OklchPicker({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (v: string) => void
}) {
  // Local working copy so the sliders stay usable even when `value` is
  // non-oklch; seeded from the value when it parses.
  const [draft, setDraft] = useState<Oklch>(
    () => parseOklch(value ?? '') ?? DEFAULT_OKLCH,
  )

  // Re-seed when the popover opens against a parseable value, so editing an
  // existing color starts from that color rather than a stale draft.
  const onOpenChange = (open: boolean) => {
    if (open) {
      const parsed = parseOklch(value ?? '')
      if (parsed) setDraft(parsed)
    }
  }

  const set = (key: keyof Oklch, n: number) => {
    const next = { ...draft, [key]: n }
    setDraft(next)
    onChange(formatOklch(next))
  }

  const preview = formatOklch(draft)

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open OKLCH picker"
          className="h-3.5 w-3.5 shrink-0 rounded border border-ed-border-2"
          style={{ backgroundColor: value || 'transparent' }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-60 space-y-3 p-3">
        <div
          aria-hidden
          className="h-10 w-full rounded border border-ed-border"
          style={{ backgroundColor: preview }}
        />
        {SLIDERS.map((s) => (
          <label key={s.key} className="block space-y-1 text-[11px] text-ed-text-muted">
            <span className="flex items-center justify-between">
              <span>{s.label}</span>
              <span className="tabular-nums text-ed-text-muted">
                {s.key === 'h' ? Math.round(draft.h) : draft[s.key].toFixed(3)}
              </span>
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={draft[s.key]}
              onChange={(e) => set(s.key, Number(e.target.value))}
              className="w-full"
            />
          </label>
        ))}
        <div className="font-mono text-[10px] break-all text-ed-text-muted">
          {preview}
        </div>
      </PopoverContent>
    </Popover>
  )
}
