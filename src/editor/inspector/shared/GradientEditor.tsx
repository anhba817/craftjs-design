import { Plus, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { ColorPicker, type ColorPickerValue } from './ColorPicker'
import {
  MAX_STOPS,
  MIN_STOPS,
  addStop,
  gradientToCss,
  removeStop,
  updateStop,
  type Gradient,
  type GradientType,
} from './gradient'

// Popover-rendered gradient editor. Receives the current Gradient + a
// commit callback; the parent ColorPicker handles persistence into the
// node's style.inline[slot].background string via gradientToCss.
//
// Stops are stored in insertion order, not sorted. The visual list reflects
// insertion order so designers can edit a stop in place without it jumping
// when its position changes. gradientToCss sorts before emitting CSS so the
// rendered output is always positionally consistent.
//
// Phase 10 § 2.12 — per-stop color editing uses a nested ColorPicker
// (allowGradient=false). Tokens picked inside resolve to a hex via
// getComputedStyle so the gradient string stays portable.
//
// Phase 10 § 2.13 — the preview bar carries draggable handles per stop.
// Direct-DOM mutation during the drag (mirroring Phase 9's ResizeOverlay
// and ColorPicker patterns) keeps the React render path quiet until
// pointerup; the numeric input field stays as the precise-input path.
export function GradientEditor({
  gradient,
  onChange,
}: {
  gradient: Gradient
  onChange: (g: Gradient) => void
}) {
  const canAdd = gradient.stops.length < MAX_STOPS

  const setType = (type: GradientType) => {
    if (type === gradient.type) return
    onChange({ ...gradient, type })
  }

  const setAngle = (angle: number) => onChange({ ...gradient, angle })
  const setPositionX = (x: number) =>
    onChange({ ...gradient, position: { ...gradient.position, x } })
  const setPositionY = (y: number) =>
    onChange({ ...gradient, position: { ...gradient.position, y } })

  const handleAdd = () => {
    const next = addStop(gradient)
    if (next) onChange(next)
  }

  return (
    <div className="space-y-2">
      <GradientPreviewBar
        gradient={gradient}
        onCommitStopPosition={(index, position) =>
          onChange(updateStop(gradient, index, { position }))
        }
      />

      <TypeToggle type={gradient.type} onChange={setType} />

      {gradient.type === 'linear' ? (
        <RangeRow
          label="Angle"
          value={gradient.angle}
          max={360}
          suffix="°"
          onChange={setAngle}
        />
      ) : (
        <>
          <RangeRow
            label="X"
            value={gradient.position.x}
            max={100}
            suffix="%"
            onChange={setPositionX}
          />
          <RangeRow
            label="Y"
            value={gradient.position.y}
            max={100}
            suffix="%"
            onChange={setPositionY}
          />
        </>
      )}

      <div className="space-y-1 border-t border-ed-border pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ed-text-muted">
            Stops ({gradient.stops.length})
          </span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            aria-label="Add stop"
            className="flex h-6 w-6 items-center justify-center rounded border border-ed-border-2 text-ed-text-muted hover:bg-ed-surface-2 disabled:opacity-40"
          >
            <Plus size={12} />
          </button>
        </div>
        <div className="space-y-1">
          {gradient.stops.map((stop, index) => (
            <StopRow
              key={index}
              color={stop.color}
              position={stop.position}
              canDelete={gradient.stops.length > MIN_STOPS}
              onChange={(patch) => onChange(updateStop(gradient, index, patch))}
              onDelete={() => onChange(removeStop(gradient, index))}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Phase 10 § 2.13 — the gradient preview bar carries one draggable
// handle per stop. pointerdown on a handle records the starting
// position + bar width; document-level pointermove updates the
// handle's `left` directly (no React render); pointerup commits via
// onCommitStopPosition. This mirrors the ResizeOverlay drag pattern:
// one onChange per gesture instead of one per pointer tick.
function GradientPreviewBar({
  gradient,
  onCommitStopPosition,
}: {
  gradient: Gradient
  onCommitStopPosition: (index: number, position: number) => void
}) {
  const preview = gradientToCss(gradient)
  const barRef = useRef<HTMLDivElement | null>(null)
  const handleRefs = useRef<(HTMLButtonElement | null)[]>([])

  const startDrag = (
    e: React.PointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    // Pre-condition: don't let the parent's drop-targets / connectors steal
    // the pointer (Tabs canvases use pointer events for selection).
    e.preventDefault()
    e.stopPropagation()
    const barWidth = barRef.current?.clientWidth ?? 1
    const startX = e.clientX
    const startPosition = gradient.stops[index].position
    const handle = handleRefs.current[index]
    let latest = startPosition

    const onMove = (mv: PointerEvent) => {
      const dx = mv.clientX - startX
      latest = Math.max(
        0,
        Math.min(100, startPosition + (dx / barWidth) * 100),
      )
      if (handle) handle.style.left = `${latest}%`
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      onCommitStopPosition(index, Math.round(latest))
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }

  return (
    <div className="relative w-full pb-2">
      <div
        ref={barRef}
        aria-hidden
        className="h-8 w-full rounded border border-ed-border-2"
        style={{ background: preview }}
      />
      {/* Handle layer overlaid on the bar's bottom edge. position:absolute
          relative to the outer wrapper; left is per-stop position %. */}
      {gradient.stops.map((stop, index) => (
        <button
          key={index}
          type="button"
          ref={(el) => {
            handleRefs.current[index] = el
          }}
          onPointerDown={(e) => startDrag(e, index)}
          aria-label={`Drag stop ${index + 1} position`}
          style={{
            position: 'absolute',
            left: `${stop.position}%`,
            bottom: 0,
            transform: 'translate(-50%, 50%)',
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: stop.color,
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            cursor: 'grab',
            // touchAction: 'none' prevents the browser's scroll gesture
            // from hijacking horizontal drags on touch devices.
            touchAction: 'none',
          }}
        />
      ))}
    </div>
  )
}

function TypeToggle({
  type,
  onChange,
}: {
  type: GradientType
  onChange: (t: GradientType) => void
}) {
  return (
    <div className="flex rounded border border-ed-border bg-ed-surface-2 p-0.5 text-xs">
      {(['linear', 'radial'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            'flex-1 rounded px-2 py-0.5 capitalize transition-colors',
            type === t
              ? 'bg-ed-surface text-ed-text-strong shadow-sm'
              : 'text-ed-text-muted hover:text-ed-text',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

function RangeRow({
  label,
  value,
  max,
  suffix,
  onChange,
}: {
  label: string
  value: number
  max: number
  suffix?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-[10px] font-medium uppercase text-ed-text-muted">
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 flex-1 cursor-pointer appearance-none rounded outline-none"
        style={{ background: '#e5e7eb' }}
      />
      <span className="w-10 text-right text-[11px] tabular-nums text-ed-text">
        {Math.round(value)}
        {suffix}
      </span>
    </div>
  )
}

/**
 * Resolves a CSS variable (`--<token>`) to a 6-char hex string. The
 * stop expects a hex literal; the parent canvas uses CSS variables
 * inline, but the gradient string serialises to JSON and is portable
 * across themes. Returning hex avoids surprising the user when they
 * switch themes — the gradient stays as picked.
 *
 * Returns null when the token isn't defined or computes to a colour
 * shape we can't parse (e.g., oklch() in older browsers without
 * computed-value normalisation).
 */
function resolveTokenToHex(token: string): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null
  }
  let probe: HTMLDivElement | null = null
  try {
    probe = document.createElement('div')
    probe.style.color = `var(--${token})`
    probe.style.position = 'absolute'
    probe.style.visibility = 'hidden'
    document.body.appendChild(probe)
    const computed = window.getComputedStyle(probe).color
    return parseRgbToHex(computed)
  } catch {
    return null
  } finally {
    if (probe) probe.remove()
  }
}

function parseRgbToHex(value: string): string | null {
  const m = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!m) return null
  const toHex = (n: string) => Number(n).toString(16).padStart(2, '0')
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`
}

// Per-stop editor row. Phase 10 — color cell is a nested ColorPicker
// (allowGradient=false). Token picks resolve to hex via
// resolveTokenToHex so the saved gradient string stays portable. The
// position numeric input stays for precise input alongside the
// drag-along-bar handle above.
function StopRow({
  color,
  position,
  canDelete,
  onChange,
  onDelete,
}: {
  color: string
  position: number
  canDelete: boolean
  onChange: (patch: { color?: string; position?: number }) => void
  onDelete: () => void
}) {
  const handleColorChange = (v: ColorPickerValue) => {
    if (v.kind === 'hex') {
      if (v.hex && v.hex !== color) onChange({ color: v.hex })
    } else if (v.kind === 'token') {
      const hex = resolveTokenToHex(v.token)
      if (hex && hex !== color) onChange({ color: hex })
    }
    // 'gradient' kind is blocked by allowGradient=false on ColorPicker.
    // 'unset' kind doesn't apply to a stop (a stop must have a colour).
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* ColorPicker's trigger is `flex w-full` — wrapping it in a
          flex-1 box constrains the width so the row layout stays
          compact. The popover that opens from the trigger sits above
          this row via Radix's portal. */}
      <div className="min-w-0 flex-1">
        <ColorPicker
          value={{ kind: 'hex', hex: color }}
          onChange={handleColorChange}
          allowVariables={false}
        />
      </div>
      <input
        type="number"
        value={position}
        min={0}
        max={100}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (Number.isFinite(v)) {
            onChange({ position: Math.max(0, Math.min(100, Math.round(v))) })
          }
        }}
        aria-label="Stop position percent"
        className="w-11 rounded border border-ed-border-2 bg-ed-surface px-1 py-0.5 text-right text-[11px] tabular-nums text-ed-text"
      />
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label="Remove stop"
        className="flex h-5 w-5 items-center justify-center rounded text-ed-danger hover:bg-ed-danger/10 disabled:opacity-30"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}
