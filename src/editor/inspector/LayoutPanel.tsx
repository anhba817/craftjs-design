import {
  DISPLAYS,
  FLEX_DIRS,
  GAPS,
  ITEMS,
  JUSTIFY,
  mergeLayout,
  parseLayout,
} from '@/style/tw-classes'
import type {
  AlignItems,
  Display,
  FlexDir,
  Gap,
  JustifyContent,
  LayoutSlice,
} from '@/style/tw-classes'
import { PanelRow } from './shared/PanelRow'
import { ValueSelect } from './shared/ValueSelect'
import { useNodeClasses } from './shared/useNodeClasses'

export function LayoutPanel({ nodeId }: { nodeId: string }) {
  const { classString, writeClasses } = useNodeClasses(nodeId)
  const { slice } = parseLayout(classString)
  const update = (patch: Partial<LayoutSlice>) => {
    writeClasses(mergeLayout(classString, patch))
  }

  return (
    <section className="space-y-2">
      <div className="text-xs font-semibold tracking-wide uppercase text-gray-500">
        Layout
      </div>
      <PanelRow label="Display">
        <ValueSelect
          value={slice.display ?? ''}
          options={DISPLAYS}
          onChange={(v) => update({ display: v as Display | undefined })}
        />
      </PanelRow>
      <PanelRow label="Direction">
        <ValueSelect
          value={slice.flexDirection ?? ''}
          options={FLEX_DIRS}
          onChange={(v) => update({ flexDirection: v as FlexDir | undefined })}
        />
      </PanelRow>
      <PanelRow label="Items">
        <ValueSelect
          value={slice.alignItems ?? ''}
          options={ITEMS}
          onChange={(v) => update({ alignItems: v as AlignItems | undefined })}
        />
      </PanelRow>
      <PanelRow label="Justify">
        <ValueSelect
          value={slice.justifyContent ?? ''}
          options={JUSTIFY}
          onChange={(v) => update({ justifyContent: v as JustifyContent | undefined })}
        />
      </PanelRow>
      <PanelRow label="Gap">
        <ValueSelect
          value={slice.gap ?? ''}
          options={GAPS}
          onChange={(v) => update({ gap: v as Gap | undefined })}
        />
      </PanelRow>
    </section>
  )
}
