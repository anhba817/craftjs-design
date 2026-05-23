import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartHorizontal,
  AlignVerticalSpaceAround,
  AlignVerticalSpaceBetween,
  StretchHorizontal,
  Baseline,
} from 'lucide-react'
import type { ReactNode } from 'react'
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

// Icon-augmented option labels. Icons are intentionally generic — alignItems
// semantics depend on flex-direction (cross axis vs main axis), but inspector
// users want a quick visual cue, not a comprehensive layout diagram.
const FLEX_DIR_ICONS: Record<FlexDir, ReactNode> = {
  row: <ArrowRight className="size-3.5" />,
  col: <ArrowDown className="size-3.5" />,
  'row-reverse': <ArrowLeft className="size-3.5" />,
  'col-reverse': <ArrowUp className="size-3.5" />,
}

const ITEMS_ICONS: Record<AlignItems, ReactNode> = {
  start: <AlignStartHorizontal className="size-3.5" />,
  center: <AlignCenterHorizontal className="size-3.5" />,
  end: <AlignEndHorizontal className="size-3.5" />,
  stretch: <StretchHorizontal className="size-3.5" />,
  baseline: <Baseline className="size-3.5" />,
}

const JUSTIFY_ICONS: Record<JustifyContent, ReactNode> = {
  start: <AlignStartHorizontal className="size-3.5 rotate-90" />,
  center: <AlignCenterHorizontal className="size-3.5 rotate-90" />,
  end: <AlignEndHorizontal className="size-3.5 rotate-90" />,
  between: <AlignVerticalSpaceBetween className="size-3.5" />,
  around: <AlignVerticalSpaceAround className="size-3.5" />,
  evenly: <AlignVerticalSpaceAround className="size-3.5" />,
}

function renderWithIcon<T extends string>(icons: Record<T, ReactNode>) {
  return (opt: T) => (
    <span className="flex items-center gap-2">
      {icons[opt]}
      <span>{opt}</span>
    </span>
  )
}

export function LayoutPanel({ nodeId }: { nodeId: string }) {
  const { classString, writeClasses } = useNodeClasses(nodeId)
  const { slice } = parseLayout(classString)
  const update = (patch: Partial<LayoutSlice>) => {
    writeClasses(mergeLayout(classString, patch))
  }

  return (
    <section className="space-y-2">
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
          renderOption={renderWithIcon(FLEX_DIR_ICONS)}
        />
      </PanelRow>
      <PanelRow label="Items">
        <ValueSelect
          value={slice.alignItems ?? ''}
          options={ITEMS}
          onChange={(v) => update({ alignItems: v as AlignItems | undefined })}
          renderOption={renderWithIcon(ITEMS_ICONS)}
        />
      </PanelRow>
      <PanelRow label="Justify">
        <ValueSelect
          value={slice.justifyContent ?? ''}
          options={JUSTIFY}
          onChange={(v) => update({ justifyContent: v as JustifyContent | undefined })}
          renderOption={renderWithIcon(JUSTIFY_ICONS)}
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
