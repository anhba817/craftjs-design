import { useMemo } from 'react'
import { listFontTokens } from '@/registry/fonts'
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
  const { classString, inlineStyle, writeClasses, writeInline } =
    useNodeClasses(nodeId, slot)
  const { slice } = parseTypography(classString)

  const update = (patch: Partial<TypographySlice>) => {
    writeClasses(mergeTypography(classString, patch))
  }

  // Phase 8 — Font dropdown options come from the runtime font-token registry.
  // Built-ins (sans, heading, mono) are registered at module load by
  // src/registry/fonts.ts; SDK consumers can registerFontToken({...}) to add
  // more. The list is captured at render time, so post-render registrations
  // don't appear until the panel re-renders (selection change, prop edit).
  // Hot-reload of fonts is a Phase 9 polish item.
  const fontOptions = useMemo(
    () => listFontTokens().map((t) => t.id),
    // Recompute when the active node changes — gives a natural refresh point
    // for SDK consumers that register fonts after the editor mounts.
    [nodeId],
  )

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
      <PanelRow label="Font">
        <ValueSelect
          value={slice.fontFamily ?? ''}
          options={fontOptions}
          onChange={(v) =>
            update({ fontFamily: v === '' ? undefined : v })
          }
        />
      </PanelRow>
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
        <ColorPicker value={colorValue} onChange={setColor} />
      </PanelRow>
    </section>
  )
}
