import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { normalizeHex } from './color-conversions'
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
export function GradientEditor({
  gradient,
  onChange,
}: {
  gradient: Gradient
  onChange: (g: Gradient) => void
}) {
  const preview = gradientToCss(gradient)
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
      <div
        aria-hidden
        className="h-8 w-full rounded border border-gray-300"
        style={{ background: preview }}
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

      <div className="space-y-1 border-t border-gray-200 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">
            Stops ({gradient.stops.length})
          </span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            aria-label="Add stop"
            className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
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

function TypeToggle({
  type,
  onChange,
}: {
  type: GradientType
  onChange: (t: GradientType) => void
}) {
  return (
    <div className="flex rounded border border-gray-200 bg-gray-50 p-0.5 text-xs">
      {(['linear', 'radial'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            'flex-1 rounded px-2 py-0.5 capitalize transition-colors',
            type === t
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
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
      <span className="w-10 text-[10px] font-medium uppercase text-gray-500">
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
      <span className="w-10 text-right text-[11px] tabular-nums text-gray-700">
        {Math.round(value)}
        {suffix}
      </span>
    </div>
  )
}

// Per-stop editor row. Hex input is locally controlled — commits on blur or
// Enter so the user typing mid-edit doesn't fire onChange with a malformed
// value. Position input commits on every change (numeric, can't be partial).
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
  const [hexInput, setHexInput] = useState(color)

  useEffect(() => {
    setHexInput(color)
  }, [color])

  const commitColor = () => {
    const normalized = normalizeHex(hexInput)
    if (normalized && normalized !== color) {
      onChange({ color: normalized })
    } else if (!normalized) {
      setHexInput(color)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <div
        aria-hidden
        className="h-5 w-5 shrink-0 rounded border border-gray-300"
        style={{ background: color }}
      />
      <input
        type="text"
        value={hexInput}
        onChange={(e) => setHexInput(e.target.value)}
        onBlur={commitColor}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitColor()
            ;(e.currentTarget as HTMLInputElement).blur()
          } else if (e.key === 'Escape') {
            setHexInput(color)
            ;(e.currentTarget as HTMLInputElement).blur()
          }
        }}
        className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-700"
      />
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
        className="w-11 rounded border border-gray-300 bg-white px-1 py-0.5 text-right text-[11px] tabular-nums text-gray-700"
      />
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label="Remove stop"
        className="flex h-5 w-5 items-center justify-center rounded text-destructive hover:bg-destructive/10 disabled:opacity-30"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}
