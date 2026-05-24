import {
  FONT_SIZES,
  FONT_WEIGHTS,
  TEXT_ALIGNS,
  mergeTypography,
  parseTypography,
} from '@/style/tw-classes'
import type {
  FontSize,
  FontWeight,
  TextAlign,
  TextColor,
  TypographySlice,
} from '@/style/tw-classes'
import { ColorPicker, colorValueFromState } from './shared/ColorPicker'
import type { ColorPickerValue } from './shared/ColorPicker'
import { PanelRow } from './shared/PanelRow'
import { ValueSelect } from './shared/ValueSelect'
import { useNodeClasses } from './shared/useNodeClasses'

export function TypographyPanel({ nodeId, slot = 'root' }: { nodeId: string; slot?: string }) {
  const { classString, inlineStyle, writeClasses, writeInline, activeBreakpoint } =
    useNodeClasses(nodeId, slot)
  const { slice } = parseTypography(classString)

  const update = (patch: Partial<TypographySlice>) => {
    writeClasses(mergeTypography(classString, patch))
  }

  // Text color is split between a token class (`text-{token}`) and an inline
  // `color: '#hex'`. Inline wins for display (matches CSS specificity). Writes
  // either set the token AND clear inline, or set inline AND clear the token —
  // the two stay mutually exclusive so the user always sees the value they
  // last picked, not a stale combo.
  const colorValue = colorValueFromState(slice.textColor, inlineStyle.color)
  const setColor = (v: ColorPickerValue) => {
    if (v.kind === 'token') {
      update({ textColor: v.token as TextColor })
      writeInline('color', undefined)
    } else if (v.kind === 'hex') {
      update({ textColor: undefined })
      writeInline('color', v.hex)
    } else {
      update({ textColor: undefined })
      writeInline('color', undefined)
    }
  }

  return (
    <section className="space-y-2">
      <PanelRow label="Size">
        <ValueSelect
          value={slice.fontSize ?? ''}
          options={FONT_SIZES}
          onChange={(v) => update({ fontSize: v as FontSize | undefined })}
        />
      </PanelRow>
      <PanelRow label="Weight">
        <ValueSelect
          value={slice.fontWeight ?? ''}
          options={FONT_WEIGHTS}
          onChange={(v) => update({ fontWeight: v as FontWeight | undefined })}
        />
      </PanelRow>
      <PanelRow label="Align">
        <ValueSelect
          value={slice.textAlign ?? ''}
          options={TEXT_ALIGNS}
          onChange={(v) => update({ textAlign: v as TextAlign | undefined })}
        />
      </PanelRow>
      <PanelRow label="Color">
        <ColorPicker
          value={colorValue}
          onChange={setColor}
          hexDisabledHint={
            activeBreakpoint !== 'base'
              ? 'Arbitrary values supported at base breakpoint only.'
              : undefined
          }
        />
      </PanelRow>
    </section>
  )
}
