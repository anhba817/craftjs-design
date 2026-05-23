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
import { ColorSelect } from './shared/ColorSelect'
import { PanelRow } from './shared/PanelRow'
import { ValueSelect } from './shared/ValueSelect'
import { useNodeClasses } from './shared/useNodeClasses'

export function TypographyPanel({ nodeId }: { nodeId: string }) {
  const { classString, writeClasses } = useNodeClasses(nodeId)
  const { slice } = parseTypography(classString)

  // Read the LIVE class string at call time, not the closure capture, to
  // protect against rapid-edit races. useNodeClasses' writeClasses takes a
  // complete next-string; we re-parse here and re-merge for each patch.
  const update = (patch: Partial<TypographySlice>) => {
    writeClasses(mergeTypography(classString, patch))
  }

  return (
    <section className="space-y-2">
      <div className="text-xs font-semibold tracking-wide uppercase text-gray-500">
        Typography
      </div>
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
        <ColorSelect
          value={slice.textColor ?? ''}
          onChange={(v) => update({ textColor: v as TextColor | undefined })}
        />
      </PanelRow>
    </section>
  )
}
