import { useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { COLORS } from '@/style/tw-classes'
import type { TokenColor } from '@/style/tw-classes'
import { useColorVariables } from '../../colors/EditorColorVariablesProvider'
import { EyedropperButton } from './EyedropperButton'
import { GradientEditor } from './GradientEditor'
import { defaultGradient, gradientToCss, type Gradient } from './gradient'
import { HslSliders } from './HslSliders'
import { RgbSliders } from './RgbSliders'

// Tagged union — the picker speaks one of five states. Panels translate this
// into slice patches (`bg: token`), inline writes (`backgroundColor: '#hex'`),
// inline `var(--brand)` writes (Phase 12 § 4.9 host CSS variables), or — for
// Phase 8 — inline `background: linear-gradient(…)` writes.
export type ColorPickerValue =
  | { kind: 'token'; token: TokenColor }
  | { kind: 'hex'; hex: string }
  | { kind: 'var'; name: string }
  | { kind: 'gradient'; gradient: Gradient }
  | { kind: 'unset' }

// Matches a bare `var(--name)` inline value so reads round-trip back to a
// 'var' picker state instead of being mistaken for a hex string.
const VAR_RE = /^var\(\s*--([\w-]+)\s*\)$/

// Convenience builder for panels reading from useNodeClasses' classString +
// inlineStyle. Precedence: gradient > inline (var/hex) > token > unset.
// Gradient is the most specific; the others are mutually exclusive at the
// panel level. An inline value of the form `var(--x)` resolves to a 'var'
// state; anything else inline is treated as a hex/raw color.
export function colorValueFromState(
  token: TokenColor | undefined,
  hex: string | undefined,
  gradient: Gradient | undefined = undefined,
): ColorPickerValue {
  if (gradient) return { kind: 'gradient', gradient }
  if (hex) {
    const m = VAR_RE.exec(hex)
    if (m) return { kind: 'var', name: m[1] }
    return { kind: 'hex', hex }
  }
  if (token) return { kind: 'token', token }
  return { kind: 'unset' }
}

// Resolve a picker value to a concrete CSS color string for an inline write
// or for contrast math. Returns null for gradient/unset (no single color).
export function cssFromColorValue(v: ColorPickerValue): string | null {
  if (v.kind === 'token') return `var(--${v.token})`
  if (v.kind === 'hex') return v.hex
  if (v.kind === 'var') return `var(--${v.name})`
  return null
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
  // Phase 12 § 4.9 — when false, the host CSS-variable swatches are hidden
  // (e.g. inside the gradient stop editor, whose stop strings shouldn't
  // carry var() references). Default true.
  allowVariables?: boolean
}

export function ColorPicker({
  value,
  onChange,
  allowGradient = false,
  allowVariables = true,
}: ColorPickerProps) {
  const { variables } = useColorVariables()
  const showVariables = allowVariables && variables.length > 0
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
      : value.kind === 'var'
      ? { backgroundColor: `var(--${value.name})` }
      : value.kind === 'gradient'
      ? { background: gradientToCss(value.gradient) }
      : checkerboardStyle()

  const labelText =
    value.kind === 'token'
      ? value.token
      : value.kind === 'hex'
      ? value.hex
      : value.kind === 'var'
      ? (variables.find((v) => v.name === value.name)?.label ?? `--${value.name}`)
      : value.kind === 'gradient'
      ? `${value.gradient.type} gradient`
      : '—'

  const commitHex = () => {
    if (HEX_RE.test(hexInput)) {
      onChange({ kind: 'hex', hex: hexInput })
    }
  }

  // Drag-driven sliders defer BOTH React state updates AND the parent
  // commit until pointerup. The earlier version updated `pickerColor` /
  // `hexInput` on every tick so the popover stayed "responsive"; in
  // practice every state update cascaded into PopoverContent positioning
  // re-renders inside Radix (1500+ commits per drag) even though the
  // parent Inspector never re-rendered. See PERFORMANCE.md Flow 5.
  //
  // Why it's safe to skip state updates during drag:
  //   - The visual picker (react-colorful HexColorPicker) manages its
  //     cursor with its own internal Saturation/Hue state. Once mounted
  //     with an initial `color`, it doesn't need parent re-renders to
  //     keep the cursor visually following the pointer.
  //   - HSL / RGB sliders are native <input type="range"> elements;
  //     during a drag the browser shows the thumb at the pointer
  //     position regardless of the `value` prop. The value sync on
  //     release reconciles back to the controlled state.
  //   - The text-input hex display stays stale during drag; designers
  //     read the color from the visual cursor / swatch, not from the
  //     text field. It refreshes on release.
  //
  // On pointerup the final hex commits via onChange (one Craft.js
  // dispatch, one Inspector re-render).
  const isDraggingRef = useRef(false)
  const pendingDragHexRef = useRef<string | null>(null)

  useEffect(() => {
    const handleUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      const finalHex = pendingDragHexRef.current
      pendingDragHexRef.current = null
      if (finalHex != null) onChange({ kind: 'hex', hex: finalHex })
    }
    // Listen on document so a drag that releases outside the popover
    // (e.g., pointer left the picker surface) still commits.
    document.addEventListener('pointerup', handleUp)
    document.addEventListener('pointercancel', handleUp)
    return () => {
      document.removeEventListener('pointerup', handleUp)
      document.removeEventListener('pointercancel', handleUp)
    }
  }, [onChange])

  const handleDragSurfacePointerDown = () => {
    isDraggingRef.current = true
    pendingDragHexRef.current = null
  }

  const commitFromSliders = (hex: string) => {
    if (isDraggingRef.current) {
      // Drag tick: stash hex in a ref. Do NOT call setState — that would
      // cascade into Radix Popover positioning re-renders.
      pendingDragHexRef.current = hex
      return
    }
    // Programmatic / non-drag commit (eyedropper, EXTERNAL `value` change).
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
          className="flex w-full items-center gap-2 rounded border border-ed-border-2 bg-ed-surface px-2 py-1 text-left text-sm text-ed-text hover:bg-ed-surface-2"
        >
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded border border-ed-border-2"
            style={swatchStyle}
          />
          <span className="truncate">{labelText}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3 p-3">
        {allowGradient && (
          <div className="flex rounded border border-ed-border bg-ed-surface-2 p-0.5 text-xs">
            <button
              type="button"
              onClick={startSolid}
              className={cn(
                'flex-1 rounded px-2 py-0.5 transition-colors',
                surface === 'solid'
                  ? 'bg-ed-surface text-ed-text-strong shadow-sm'
                  : 'text-ed-text-muted hover:text-ed-text',
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
                  ? 'bg-ed-surface text-ed-text-strong shadow-sm'
                  : 'text-ed-text-muted hover:text-ed-text',
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
              <div className="mb-1.5 text-xs font-medium text-ed-text-muted">Theme tokens</div>
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
                          ? 'border-ed-accent ring-2 ring-ed-accent/40'
                          : 'border-ed-border-2 hover:border-ed-border-strong',
                      )}
                      style={{ backgroundColor: `var(--${c})` }}
                    />
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => onChange({ kind: 'unset' })}
                className="mt-2 text-xs text-ed-text-muted underline hover:text-ed-text"
              >
                Clear color
              </button>
            </div>
            {showVariables && (
              <div className="border-t border-ed-border pt-3">
                <div className="mb-1.5 text-xs font-medium text-ed-text-muted">
                  Design variables
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {variables.map((v) => {
                    const isActive = value.kind === 'var' && value.name === v.name
                    return (
                      <button
                        key={v.name}
                        type="button"
                        title={v.label ?? `--${v.name}`}
                        onClick={() => onChange({ kind: 'var', name: v.name })}
                        className={cn(
                          'h-6 w-6 rounded border transition-colors',
                          isActive
                            ? 'border-ed-accent ring-2 ring-ed-accent/40'
                            : 'border-ed-border-2 hover:border-ed-border-strong',
                        )}
                        style={{ backgroundColor: `var(--${v.name})` }}
                      />
                    )
                  })}
                </div>
              </div>
            )}
            <div className="space-y-2 border-t border-ed-border pt-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-ed-text-muted">Custom color</div>
                <ModeToggle mode={solidMode} onChange={setSolidMode} />
              </div>

              <div onPointerDown={handleDragSurfacePointerDown}>
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
              </div>

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
                  className="min-w-0 flex-1 rounded border border-ed-border-2 bg-ed-surface px-1.5 py-1 text-sm text-ed-text"
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
    <div className="flex rounded border border-ed-border bg-ed-surface-2 p-0.5 text-[10px]">
      {MODE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded px-1.5 py-0.5 transition-colors',
            mode === opt.value
              ? 'bg-ed-surface text-ed-text-strong shadow-sm'
              : 'text-ed-text-muted hover:text-ed-text',
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
