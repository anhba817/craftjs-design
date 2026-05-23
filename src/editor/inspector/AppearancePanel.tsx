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
  TokenColor,
} from '@/style/tw-classes'
import { ColorSelect } from './shared/ColorSelect'
import { PanelRow } from './shared/PanelRow'
import { ValueSelect } from './shared/ValueSelect'
import { useNodeClasses } from './shared/useNodeClasses'

// 'default' sentinel for bare `border` / `rounded` is exposed in the ValueSelect
// dropdowns alongside the explicit values — selecting it emits the bare class.
const BORDER_WIDTH_OPTIONS = ['default', ...BORDER_WIDTHS] as const
const RADIUS_OPTIONS = ['default', ...RADII] as const

export function AppearancePanel({ nodeId }: { nodeId: string }) {
  const { classString, writeClasses } = useNodeClasses(nodeId)
  const { slice } = parseAppearance(classString)
  const update = (patch: Partial<AppearanceSlice>) => {
    writeClasses(mergeAppearance(classString, patch))
  }

  return (
    <section className="space-y-2">
      <div className="text-xs font-semibold tracking-wide uppercase text-gray-500">
        Appearance
      </div>
      <PanelRow label="Fill">
        <ColorSelect
          value={slice.bg ?? ''}
          onChange={(v) => update({ bg: v as TokenColor | undefined })}
        />
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
        <ColorSelect
          value={slice.borderColor ?? ''}
          onChange={(v) => update({ borderColor: v as TokenColor | undefined })}
        />
      </PanelRow>
      <PanelRow label="Radius">
        <ValueSelect
          value={slice.rounded ?? ''}
          options={RADIUS_OPTIONS}
          onChange={(v) => update({ rounded: v as Radius | undefined })}
        />
      </PanelRow>
    </section>
  )
}
