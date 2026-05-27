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
import type { TextColor } from '@/style/tw-classes'
import { ImagePicker } from '../assets/ImagePicker'
import { parseBgUrl, toBgUrl } from './shared/backgroundImage'
import { ColorPicker, colorValueFromState } from './shared/ColorPicker'
import type { ColorPickerValue } from './shared/ColorPicker'
import { gradientToCss, parseGradient } from './shared/gradient'
import { mergeSlices } from './shared/mergeSlices'
import { NumericInput } from './shared/NumericInput'
import { PanelRow } from './shared/PanelRow'
import { ValueSelect } from './shared/ValueSelect'
import { useNodeClassesMulti } from './shared/useNodeClassesMulti'

// 'default' sentinel for bare `border` / `rounded` is exposed in the ValueSelect
// dropdowns alongside the explicit values — selecting it emits the bare class.
const BORDER_WIDTH_OPTIONS = ['default', ...BORDER_WIDTHS] as const
const RADIUS_OPTIONS = ['default', ...RADII] as const

// Phase 12 § 4.6 — background-image controls.
const BG_REPEAT = ['repeat', 'no-repeat', 'repeat-x', 'repeat-y'] as const
const BG_SIZE = ['cover', 'contain', 'auto'] as const
const BG_POSITION = ['center', 'top', 'bottom', 'left', 'right'] as const

export function AppearancePanel({
  nodeIds,
  slot = 'root',
}: {
  nodeId: string
  nodeIds: readonly string[]
  slot?: string
}) {
  const { classStrings, inlineStyles, writeClassesAll, writeInlineAll } =
    useNodeClassesMulti(nodeIds, slot)
  const slices: Record<string, string | undefined>[] = classStrings.map(
    (cs) => parseAppearance(cs).slice as Record<string, string | undefined>,
  )
  const { merged, mixed } = mergeSlices(slices)
  const { merged: mergedInline, mixed: mixedInline } = mergeSlices(
    inlineStyles as readonly Record<string, string>[],
  )
  const update = (patch: Partial<AppearanceSlice>) => {
    writeClassesAll((current) => mergeAppearance(current, patch))
  }
  function valueOrEmpty<T extends string>(key: string): T | '' {
    return (mixed.has(key) ? '' : (merged[key] ?? '')) as T | ''
  }
  const placeholderFor = (key: string) =>
    mixed.has(key) ? '— Mixed' : undefined

  // Phase 8 — Fill accepts gradients in addition to tokens / hex. A gradient
  // lives in `inline.background` (longhand including the gradient string);
  // hex still lives in `inline.backgroundColor`; tokens still live in the
  // `bg-*` slice class. The three are mutually exclusive at write time.
  const fillMixed =
    mixed.has('bg') ||
    mixedInline.has('backgroundColor') ||
    mixedInline.has('background')
  const inlineBg = mergedInline.background
  const fillGradient = !fillMixed && inlineBg ? parseGradient(inlineBg) : null
  const fillValue = fillMixed
    ? colorValueFromState(undefined, undefined)
    : colorValueFromState(
        merged.bg as TextColor | undefined,
        mergedInline.backgroundColor,
        fillGradient ?? undefined,
      )

  const borderColorMixed =
    mixed.has('borderColor') || mixedInline.has('borderColor')
  const borderColorValue = borderColorMixed
    ? colorValueFromState(undefined, undefined)
    : colorValueFromState(
        merged.borderColor as TextColor | undefined,
        mergedInline.borderColor,
      )

  const setFill = (v: ColorPickerValue) => {
    if (v.kind === 'token') {
      update({ bg: v.token })
      writeInlineAll('backgroundColor', undefined)
      writeInlineAll('background', undefined)
    } else if (v.kind === 'hex' || v.kind === 'var') {
      update({ bg: undefined })
      writeInlineAll(
        'backgroundColor',
        v.kind === 'hex' ? v.hex : `var(--${v.name})`,
      )
      writeInlineAll('background', undefined)
    } else if (v.kind === 'gradient') {
      update({ bg: undefined })
      writeInlineAll('backgroundColor', undefined)
      writeInlineAll('background', gradientToCss(v.gradient))
      // Gradient uses the `background` shorthand, which resets
      // background-image — clear any image so they don't fight.
      writeInlineAll('backgroundImage', undefined)
    } else {
      update({ bg: undefined })
      writeInlineAll('backgroundColor', undefined)
      writeInlineAll('background', undefined)
    }
  }

  // Phase 12 § 4.6 — background image. Stored as inline backgroundImage
  // (url("…")) + repeat/size/position longhands. Coexists with a solid
  // fill color (image renders over backgroundColor); mutually exclusive
  // with a gradient (which uses the `background` shorthand).
  const bgImageMixed = mixedInline.has('backgroundImage')
  const bgUrl = bgImageMixed ? '' : parseBgUrl(mergedInline.backgroundImage)
  const hasBgImage = bgUrl.length > 0
  const setBgUrl = (url: string) => {
    if (url) {
      writeInlineAll('backgroundImage', toBgUrl(url))
      writeInlineAll('background', undefined) // drop any gradient shorthand
    } else {
      writeInlineAll('backgroundImage', undefined)
      writeInlineAll('backgroundRepeat', undefined)
      writeInlineAll('backgroundSize', undefined)
      writeInlineAll('backgroundPosition', undefined)
    }
  }

  const setBorderColor = (v: ColorPickerValue) => {
    if (v.kind === 'token') {
      update({ borderColor: v.token })
      writeInlineAll('borderColor', undefined)
    } else if (v.kind === 'hex' || v.kind === 'var') {
      update({ borderColor: undefined })
      writeInlineAll(
        'borderColor',
        v.kind === 'hex' ? v.hex : `var(--${v.name})`,
      )
    } else {
      update({ borderColor: undefined })
      writeInlineAll('borderColor', undefined)
    }
  }

  return (
    <section className="space-y-2">
      <PanelRow label="Fill">
        <ColorPicker value={fillValue} onChange={setFill} allowGradient />
      </PanelRow>
      <PanelRow label="Image">
        <ImagePicker value={bgUrl} onChange={setBgUrl} />
      </PanelRow>
      {hasBgImage && (
        <>
          <PanelRow label="Repeat">
            <ValueSelect<(typeof BG_REPEAT)[number]>
              value={
                (mixedInline.has('backgroundRepeat')
                  ? ''
                  : (mergedInline.backgroundRepeat ?? '')) as
                  | (typeof BG_REPEAT)[number]
                  | ''
              }
              options={BG_REPEAT}
              onChange={(v) =>
                writeInlineAll('backgroundRepeat', v || undefined)
              }
              placeholder={
                mixedInline.has('backgroundRepeat') ? '— Mixed' : undefined
              }
            />
          </PanelRow>
          <PanelRow label="Size">
            <ValueSelect<(typeof BG_SIZE)[number]>
              value={
                (mixedInline.has('backgroundSize')
                  ? ''
                  : (mergedInline.backgroundSize ?? '')) as
                  | (typeof BG_SIZE)[number]
                  | ''
              }
              options={BG_SIZE}
              onChange={(v) => writeInlineAll('backgroundSize', v || undefined)}
              placeholder={
                mixedInline.has('backgroundSize') ? '— Mixed' : undefined
              }
            />
          </PanelRow>
          <PanelRow label="Position">
            <ValueSelect<(typeof BG_POSITION)[number]>
              value={
                (mixedInline.has('backgroundPosition')
                  ? ''
                  : (mergedInline.backgroundPosition ?? '')) as
                  | (typeof BG_POSITION)[number]
                  | ''
              }
              options={BG_POSITION}
              onChange={(v) =>
                writeInlineAll('backgroundPosition', v || undefined)
              }
              placeholder={
                mixedInline.has('backgroundPosition') ? '— Mixed' : undefined
              }
            />
          </PanelRow>
        </>
      )}
      <PanelRow label="Border">
        <ValueSelect<BorderWidth | 'default'>
          value={valueOrEmpty<BorderWidth | 'default'>('borderWidth')}
          options={BORDER_WIDTH_OPTIONS}
          onChange={(v) => update({ borderWidth: v as BorderWidth | undefined })}
          placeholder={placeholderFor('borderWidth')}
        />
      </PanelRow>
      <PanelRow label="Style">
        <ValueSelect<BorderStyle>
          value={valueOrEmpty<BorderStyle>('borderStyle')}
          options={BORDER_STYLES}
          onChange={(v) => update({ borderStyle: v })}
          placeholder={placeholderFor('borderStyle')}
        />
      </PanelRow>
      <PanelRow label="B Color">
        <ColorPicker value={borderColorValue} onChange={setBorderColor} />
      </PanelRow>
      <PanelRow label="Radius">
        <NumericInput
          value={
            mixed.has('rounded') || mixedInline.has('borderRadius')
              ? ''
              : (mergedInline.borderRadius ?? merged.rounded ?? '')
          }
          tokens={RADIUS_OPTIONS}
          placeholder={
            mixed.has('rounded') || mixedInline.has('borderRadius')
              ? '— Mixed'
              : undefined
          }
          onChange={(next) => {
            if (next === '') {
              update({ rounded: undefined })
              writeInlineAll('borderRadius', undefined)
            } else if ((RADIUS_OPTIONS as readonly string[]).includes(next)) {
              update({ rounded: next as Radius })
              writeInlineAll('borderRadius', undefined)
            } else {
              update({ rounded: undefined })
              writeInlineAll('borderRadius', next)
            }
          }}
        />
      </PanelRow>
    </section>
  )
}

