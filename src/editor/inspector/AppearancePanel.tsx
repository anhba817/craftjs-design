import {
  BORDER_STYLES,
  BORDER_WIDTHS,
  RADII,
  mergeAppearance,
  parseAppearance,
} from '@/style/tw-classes'
import type {
  AppearanceSlice,
  BorderStyle,
  BorderWidth,
  Radius,
} from '@/style/tw-classes'
import { ColorPicker, colorValueFromState } from './shared/ColorPicker'
import type { ColorPickerValue } from './shared/ColorPicker'
import { NumericInput } from './shared/NumericInput'
import { PanelRow } from './shared/PanelRow'
import { ValueSelect } from './shared/ValueSelect'
import { useNodeClasses } from './shared/useNodeClasses'

// 'default' sentinel for bare `border` / `rounded` is exposed in the ValueSelect
// dropdowns alongside the explicit values — selecting it emits the bare class.
const BORDER_WIDTH_OPTIONS = ['default', ...BORDER_WIDTHS] as const
const RADIUS_OPTIONS = ['default', ...RADII] as const

export function AppearancePanel({ nodeId }: { nodeId: string }) {
  const { classString, inlineStyle, writeClasses, writeInline, activeBreakpoint } =
    useNodeClasses(nodeId)
  const { slice } = parseAppearance(classString)
  const update = (patch: Partial<AppearanceSlice>) => {
    writeClasses(mergeAppearance(classString, patch))
  }

  const fillValue = colorValueFromState(slice.bg, inlineStyle.backgroundColor)
  const borderColorValue = colorValueFromState(slice.borderColor, inlineStyle.borderColor)

  const setFill = (v: ColorPickerValue) => {
    if (v.kind === 'token') {
      update({ bg: v.token })
      writeInline('backgroundColor', undefined)
    } else if (v.kind === 'hex') {
      update({ bg: undefined })
      writeInline('backgroundColor', v.hex)
    } else {
      update({ bg: undefined })
      writeInline('backgroundColor', undefined)
    }
  }

  const setBorderColor = (v: ColorPickerValue) => {
    if (v.kind === 'token') {
      update({ borderColor: v.token })
      writeInline('borderColor', undefined)
    } else if (v.kind === 'hex') {
      update({ borderColor: undefined })
      writeInline('borderColor', v.hex)
    } else {
      update({ borderColor: undefined })
      writeInline('borderColor', undefined)
    }
  }

  const hexHint =
    activeBreakpoint !== 'base'
      ? 'Arbitrary values supported at base breakpoint only.'
      : undefined

  return (
    <section className="space-y-2">
      <PanelRow label="Fill">
        <ColorPicker value={fillValue} onChange={setFill} hexDisabledHint={hexHint} />
      </PanelRow>
      <PanelRow label="Border">
        <ValueSelect
          value={slice.borderWidth ?? ''}
          options={BORDER_WIDTH_OPTIONS}
          onChange={(v) => update({ borderWidth: v as BorderWidth | undefined })}
        />
      </PanelRow>
      <PanelRow label="Style">
        <ValueSelect
          value={slice.borderStyle ?? ''}
          options={BORDER_STYLES}
          onChange={(v) => update({ borderStyle: v as BorderStyle | undefined })}
        />
      </PanelRow>
      <PanelRow label="B Color">
        <ColorPicker
          value={borderColorValue}
          onChange={setBorderColor}
          hexDisabledHint={hexHint}
        />
      </PanelRow>
      <PanelRow label="Radius">
        <NumericInput
          value={inlineStyle.borderRadius ?? slice.rounded ?? ''}
          tokens={RADIUS_OPTIONS}
          arbitraryDisabledHint={hexHint}
          onChange={(next) => {
            if (next === '') {
              update({ rounded: undefined })
              writeInline('borderRadius', undefined)
            } else if ((RADIUS_OPTIONS as readonly string[]).includes(next)) {
              update({ rounded: next as Radius })
              writeInline('borderRadius', undefined)
            } else {
              update({ rounded: undefined })
              writeInline('borderRadius', next)
            }
          }}
        />
      </PanelRow>
    </section>
  )
}

