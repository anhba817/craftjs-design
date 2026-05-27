import { useMemo, useSyncExternalStore } from 'react'
import {
  getFontRegistryVersion,
  listFontTokens,
  subscribeFontRegistry,
} from '@/registry/fonts'
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
import {
  ColorPicker,
  colorValueFromState,
  cssFromColorValue,
} from './shared/ColorPicker'
import type { ColorPickerValue } from './shared/ColorPicker'
import { ContrastBadge } from './shared/ContrastBadge'
import { mergeSlices } from './shared/mergeSlices'
import { PanelRow } from './shared/PanelRow'
import { ValueSelect } from './shared/ValueSelect'
import { useNodeClassesMulti } from './shared/useNodeClassesMulti'

export function TypographyPanel({
  nodeId,
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
    (cs) => parseTypography(cs).slice as Record<string, string | undefined>,
  )
  const { merged, mixed } = mergeSlices(slices)
  const { merged: mergedInline, mixed: mixedInline } = mergeSlices(
    inlineStyles as readonly Record<string, string>[],
  )

  const update = (patch: Partial<TypographySlice>) => {
    writeClassesAll((current) => mergeTypography(current, patch))
  }
  function valueOrEmpty<T extends string>(key: string): T | '' {
    return (mixed.has(key) ? '' : (merged[key] ?? '')) as T | ''
  }
  const placeholderFor = (key: string) =>
    mixed.has(key) ? '— Mixed' : undefined

  // Phase 8 — Font dropdown options come from the runtime font-token registry.
  // Built-ins (sans, heading, mono) are registered at module load by
  // src/registry/fonts.ts; SDK consumers can registerFontToken({...}) to add
  // more.
  //
  // Phase 10 § 2.7 — useSyncExternalStore subscribes to the registry's
  // version counter. Calling registerFontToken / unregisterFontToken
  // post-mount bumps the counter; this hook re-runs and the dropdown
  // reflects the new list immediately. Replaces the prior `[nodeId]`
  // hack that only refreshed on selection change.
  const fontRegistryVersion = useSyncExternalStore(
    subscribeFontRegistry,
    getFontRegistryVersion,
    getFontRegistryVersion,
  )
  const fontOptions = useMemo(
    () => listFontTokens().map((t) => t.id),
    [fontRegistryVersion],
  )

  // Text color is split between a token class (`text-{token}`) and an inline
  // `color: '#hex'`. Inline wins for display (matches CSS specificity). Writes
  // either set the token AND clear inline, or set inline AND clear the token —
  // the two stay mutually exclusive so the user always sees the value they
  // last picked, not a stale combo.
  const colorMixed =
    mixed.has('textColor') || mixedInline.has('color')
  const colorValue = colorMixed
    ? colorValueFromState(undefined, undefined)
    : colorValueFromState(
        merged.textColor as TextColor | undefined,
        mergedInline.color,
      )
  const setColor = (v: ColorPickerValue) => {
    if (v.kind === 'token') {
      update({ textColor: v.token as TextColor })
      writeInlineAll('color', undefined)
    } else if (v.kind === 'hex') {
      update({ textColor: undefined })
      writeInlineAll('color', v.hex)
    } else if (v.kind === 'var') {
      update({ textColor: undefined })
      writeInlineAll('color', `var(--${v.name})`)
    } else {
      update({ textColor: undefined })
      writeInlineAll('color', undefined)
    }
  }

  // Phase 12 § 4.14 — resolve the chosen color to a concrete CSS string
  // for the live contrast badge (token → var(--token), hex → hex, etc.).
  const fgColor = colorMixed ? null : cssFromColorValue(colorValue)

  return (
    <section className="space-y-2">
      <PanelRow label="Font">
        <ValueSelect<string>
          value={valueOrEmpty<string>('fontFamily')}
          options={fontOptions}
          onChange={(v) => update({ fontFamily: v ?? undefined })}
          placeholder={placeholderFor('fontFamily')}
        />
      </PanelRow>
      <PanelRow label="Size">
        <ValueSelect<FontSize>
          value={valueOrEmpty<FontSize>('fontSize')}
          options={FONT_SIZES}
          onChange={(v) => update({ fontSize: v })}
          placeholder={placeholderFor('fontSize')}
        />
      </PanelRow>
      <PanelRow label="Weight">
        <ValueSelect<FontWeight>
          value={valueOrEmpty<FontWeight>('fontWeight')}
          options={FONT_WEIGHTS}
          onChange={(v) => update({ fontWeight: v })}
          placeholder={placeholderFor('fontWeight')}
        />
      </PanelRow>
      <PanelRow label="Align">
        <ValueSelect<TextAlign>
          value={valueOrEmpty<TextAlign>('textAlign')}
          options={TEXT_ALIGNS}
          onChange={(v) => update({ textAlign: v })}
          placeholder={placeholderFor('textAlign')}
        />
      </PanelRow>
      <PanelRow label="Color">
        <ColorPicker value={colorValue} onChange={setColor} />
      </PanelRow>
      <div className="pl-16">
        <ContrastBadge fg={fgColor} nodeId={nodeId} />
      </div>
    </section>
  )
}
