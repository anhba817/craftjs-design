import { useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { COLORS } from '@/style/tw-classes'
import type { TokenColor } from '@/style/tw-classes'

// Tagged union — the picker speaks one of three states. Panels translate this
// into slice patches (`bg: token`) AND inline writes (`backgroundColor: '#hex'`).
export type ColorPickerValue =
  | { kind: 'token'; token: TokenColor }
  | { kind: 'hex'; hex: string }
  | { kind: 'unset' }

// Convenience builder for panels reading from useNodeClasses' classString + inlineStyle.
// Inline takes precedence — the user picked an arbitrary value explicitly.
export function colorValueFromState(
  token: TokenColor | undefined,
  hex: string | undefined,
): ColorPickerValue {
  if (hex) return { kind: 'hex', hex }
  if (token) return { kind: 'token', token }
  return { kind: 'unset' }
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

interface ColorPickerProps {
  value: ColorPickerValue
  onChange: (v: ColorPickerValue) => void
  // If set, hex / visual picker inputs are disabled and this hint renders
  // beneath the disabled section. Panels pass a message when
  // activeBreakpoint !== 'base' (responsive arbitrary lands in Phase 5+).
  hexDisabledHint?: string
}

export function ColorPicker({ value, onChange, hexDisabledHint }: ColorPickerProps) {
  // Independent state for the visual picker and hex text input. Both sync to
  // the upstream `value` when it changes externally (token click, undo, etc.).
  // When the user drags the visual picker, every onChange fires a commit so
  // the canvas updates in real time. Acceptable for editor-scale node counts;
  // Phase 6 polish could debounce via mouseup.
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
  }, [value])

  const hexDisabled = !!hexDisabledHint

  const swatchStyle =
    value.kind === 'token'
      ? { backgroundColor: `var(--${value.token})` }
      : value.kind === 'hex'
      ? { backgroundColor: value.hex }
      : checkerboardStyle()

  const labelText =
    value.kind === 'token' ? value.token : value.kind === 'hex' ? value.hex : '—'

  const commitHex = () => {
    if (HEX_RE.test(hexInput)) {
      onChange({ kind: 'hex', hex: hexInput })
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
      <PopoverContent className="w-64 space-y-3 p-3">
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
        <div
          className={cn(
            'space-y-2 border-t border-gray-200 pt-3',
            hexDisabled && 'pointer-events-none opacity-60',
          )}
          aria-disabled={hexDisabled}
        >
          <div className="text-xs font-medium text-gray-600">Custom color</div>
          {/* react-colorful renders its own saturation/lightness picker + hue
              slider with inlined styles. We constrain its width to match the
              popover content; height stays at its natural ~200px (S/L) + ~28px
              (hue slider). */}
          <HexColorPicker
            color={pickerColor}
            onChange={(hex) => {
              setPickerColor(hex)
              setHexInput(hex)
              onChange({ kind: 'hex', hex })
            }}
            style={{ width: '100%', height: '160px' }}
          />
          <input
            type="text"
            value={hexInput}
            disabled={hexDisabled}
            onChange={(e) => setHexInput(e.target.value)}
            onBlur={commitHex}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitHex()
            }}
            placeholder="#fa8072"
            className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700 disabled:bg-gray-100"
          />
          {hexDisabled && (
            <p className="text-[10px] text-gray-500">{hexDisabledHint}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Standard "unset color" checkerboard pattern using stacked diagonal gradients.
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
