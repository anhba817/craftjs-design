import { useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { COLORS } from '@/style/tw-classes'
import type { TokenColor } from '@/style/tw-classes'
import { EyedropperButton } from './EyedropperButton'
import { GradientEditor } from './GradientEditor'
import { defaultGradient, gradientToCss, type Gradient } from './gradient'
import { HslSliders } from './HslSliders'
import { RgbSliders } from './RgbSliders'

// Tagged union — the picker speaks one of four states. Panels translate this
// into slice patches (`bg: token`), inline writes (`backgroundColor: '#hex'`),
// or — for Phase 8 — inline `background: linear-gradient(…)` writes.
export type ColorPickerValue =
  | { kind: 'token'; token: TokenColor }
  | { kind: 'hex'; hex: string }
  | { kind: 'gradient'; gradient: Gradient }
  | { kind: 'unset' }

// Convenience builder for panels reading from useNodeClasses' classString +
// inlineStyle. Precedence: gradient > hex > token > unset. Gradient is the
// most specific; the others are mutually exclusive at the panel level.
export function colorValueFromState(
  token: TokenColor | undefined,
  hex: string | undefined,
  gradient: Gradient | undefined = undefined,
): ColorPickerValue {
  if (gradient) return { kind: 'gradient', gradient }
  if (hex) return { kind: 'hex', hex }
  if (token) return { kind: 'token', token }
  return { kind: 'unset' }
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

type EditMode = 'visual' | 'hsl' | 'rgb'

interface ColorPickerProps {
  value: ColorPickerValue
  onChange: (v: ColorPickerValue) => void
  // Phase 8 — when true, the popover shows a Solid/Gradient toggle at the
  // top and accepts gradient values. Default false to keep panels that
  // can't represent gradients (text color, border color) constrained.
  allowGradient?: boolean
}

export function ColorPicker({
  value,
  onChange,
  allowGradient = false,
}: ColorPickerProps) {
  // Mode of the editing surface within the popover. Defaults from the
  // current value: gradient value → 'gradient' mode; otherwise 'solid'.
  const [surface, setSurface] = useState<'solid' | 'gradient'>(
    value.kind === 'gradient' ? 'gradient' : 'solid',
  )
  const [solidMode, setSolidMode] = useState<EditMode>('visual')

  const [pickerColor, setPickerColor] = useState(
    value.kind === 'hex' ? value.hex : '#000000',
  )
  const [hexInput, setHexInput] = useState(
    value.kind === 'hex' ? value.hex : '',
  )

  useEffect(() => {
    if (value.kind === 'hex') {
      setPickerColor(value.hex)
      setHexInput(value.hex)
    }
    // Surface follows external value changes — picking a token externally
    // while gradient mode is open switches back to solid.
    if (value.kind === 'gradient') setSurface('gradient')
    else if (value.kind === 'hex' || value.kind === 'token') {
      setSurface('solid')
    }
  }, [value])

  const swatchStyle =
    value.kind === 'token'
      ? { backgroundColor: `var(--${value.token})` }
      : value.kind === 'hex'
      ? { backgroundColor: value.hex }
      : value.kind === 'gradient'
      ? { background: gradientToCss(value.gradient) }
      : checkerboardStyle()

  const labelText =
    value.kind === 'token'
      ? value.token
      : value.kind === 'hex'
      ? value.hex
      : value.kind === 'gradient'
      ? `${value.gradient.type} gradient`
      : '—'

  const commitHex = () => {
    if (HEX_RE.test(hexInput)) {
      onChange({ kind: 'hex', hex: hexInput })
    }
  }

  const commitFromSliders = (hex: string) => {
    setPickerColor(hex)
    setHexInput(hex)
    onChange({ kind: 'hex', hex })
  }

  const startGradient = () => {
    setSurface('gradient')
    if (value.kind !== 'gradient') {
      onChange({ kind: 'gradient', gradient: defaultGradient() })
    }
  }

  const startSolid = () => {
    setSurface('solid')
    // If switching from a gradient, fall back to the last-known hex (or
    // pickerColor default). Token/unset stay as-is.
    if (value.kind === 'gradient') {
      onChange({ kind: 'hex', hex: pickerColor })
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded border border-gray-300 bg-white px-2 py-1 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded border border-gray-300"
            style={swatchStyle}
          />
          <span className="truncate">{labelText}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3 p-3">
        {allowGradient && (
          <div className="flex rounded border border-gray-200 bg-gray-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={startSolid}
              className={cn(
                'flex-1 rounded px-2 py-0.5 transition-colors',
                surface === 'solid'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              Solid
            </button>
            <button
              type="button"
              onClick={startGradient}
              className={cn(
                'flex-1 rounded px-2 py-0.5 transition-colors',
                surface === 'gradient'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              Gradient
            </button>
          </div>
        )}

        {surface === 'gradient' && value.kind === 'gradient' ? (
          <GradientEditor
            gradient={value.gradient}
            onChange={(g) => onChange({ kind: 'gradient', gradient: g })}
          />
        ) : (
          <>
            <div>
              <div className="mb-1.5 text-xs font-medium text-gray-600">Theme tokens</div>
              <div className="grid grid-cols-5 gap-1.5">
                {COLORS.map((c) => {
                  const isActive = value.kind === 'token' && value.token === c
                  return (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      onClick={() => onChange({ kind: 'token', token: c })}
                      className={cn(
                        'h-6 w-6 rounded border transition-colors',
                        isActive
                          ? 'border-primary ring-2 ring-primary/40'
                          : 'border-gray-300 hover:border-gray-500',
                      )}
                      style={{ backgroundColor: `var(--${c})` }}
                    />
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => onChange({ kind: 'unset' })}
                className="mt-2 text-xs text-gray-500 underline hover:text-gray-700"
              >
                Clear color
              </button>
            </div>
            <div className="space-y-2 border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-gray-600">Custom color</div>
                <ModeToggle mode={solidMode} onChange={setSolidMode} />
              </div>

              {solidMode === 'visual' && (
                <HexColorPicker
                  color={pickerColor}
                  onChange={(hex) => commitFromSliders(hex)}
                  style={{ width: '100%', height: '160px' }}
                />
              )}
              {solidMode === 'hsl' && (
                <HslSliders hex={pickerColor} onChange={commitFromSliders} />
              )}
              {solidMode === 'rgb' && (
                <RgbSliders hex={pickerColor} onChange={commitFromSliders} />
              )}

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => setHexInput(e.target.value)}
                  onBlur={commitHex}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitHex()
                  }}
                  placeholder="#fa8072"
                  className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700"
                />
                <EyedropperButton onPick={commitFromSliders} />
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

const MODE_OPTIONS: { value: EditMode; label: string }[] = [
  { value: 'visual', label: 'Visual' },
  { value: 'hsl', label: 'HSL' },
  { value: 'rgb', label: 'RGB' },
]

function ModeToggle({
  mode,
  onChange,
}: {
  mode: EditMode
  onChange: (m: EditMode) => void
}) {
  return (
    <div className="flex rounded border border-gray-200 bg-gray-50 p-0.5 text-[10px]">
      {MODE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded px-1.5 py-0.5 transition-colors',
            mode === opt.value
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function checkerboardStyle(): React.CSSProperties {
  return {
    backgroundColor: 'transparent',
    backgroundImage:
      'linear-gradient(45deg, #ddd 25%, transparent 25%), ' +
      'linear-gradient(-45deg, #ddd 25%, transparent 25%), ' +
      'linear-gradient(45deg, transparent 75%, #ddd 75%), ' +
      'linear-gradient(-45deg, transparent 75%, #ddd 75%)',
    backgroundSize: '8px 8px',
    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
  }
}
