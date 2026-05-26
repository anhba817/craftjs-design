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
import { mergeSlices } from './shared/mergeSlices'
import { PanelRow } from './shared/PanelRow'
import { ValueSelect } from './shared/ValueSelect'
import { useNodeClassesMulti } from './shared/useNodeClassesMulti'

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

export function LayoutPanel({
  nodeIds,
  slot = 'root',
}: {
  nodeId: string
  nodeIds: readonly string[]
  slot?: string
}) {
  const { classStrings, writeClassesAll } = useNodeClassesMulti(nodeIds, slot)
  const slices: Record<string, string | undefined>[] = classStrings.map(
    (cs) => parseLayout(cs).slice as Record<string, string | undefined>,
  )
  const { merged, mixed } = mergeSlices(slices)
  const update = (patch: Partial<LayoutSlice>) => {
    writeClassesAll((current) => mergeLayout(current, patch))
  }
  // ValueSelect uses '' to mean "no value" + placeholder shows "—". For
  // mixed: pass '' as value and a custom placeholder so the field looks
  // intentionally blanked rather than empty.
  function valueOrEmpty<T extends string>(key: string): T | '' {
    return (mixed.has(key) ? '' : (merged[key] ?? '')) as T | ''
  }
  const placeholderFor = (key: string) =>
    mixed.has(key) ? '— Mixed' : undefined

  return (
    <section className="space-y-2">
      <PanelRow label="Display">
        <ValueSelect<Display>
          value={valueOrEmpty<Display>('display')}
          options={DISPLAYS}
          onChange={(v) => update({ display: v })}
          placeholder={placeholderFor('display')}
        />
      </PanelRow>
      <PanelRow label="Direction">
        <ValueSelect<FlexDir>
          value={valueOrEmpty<FlexDir>('flexDirection')}
          options={FLEX_DIRS}
          onChange={(v) => update({ flexDirection: v })}
          renderOption={renderWithIcon(FLEX_DIR_ICONS)}
          placeholder={placeholderFor('flexDirection')}
        />
      </PanelRow>
      <PanelRow label="Items">
        <ValueSelect<AlignItems>
          value={valueOrEmpty<AlignItems>('alignItems')}
          options={ITEMS}
          onChange={(v) => update({ alignItems: v })}
          renderOption={renderWithIcon(ITEMS_ICONS)}
          placeholder={placeholderFor('alignItems')}
        />
      </PanelRow>
      <PanelRow label="Justify">
        <ValueSelect<JustifyContent>
          value={valueOrEmpty<JustifyContent>('justifyContent')}
          options={JUSTIFY}
          onChange={(v) => update({ justifyContent: v })}
          renderOption={renderWithIcon(JUSTIFY_ICONS)}
          placeholder={placeholderFor('justifyContent')}
        />
      </PanelRow>
      <PanelRow label="Gap">
        <ValueSelect<Gap>
          value={valueOrEmpty<Gap>('gap')}
          options={GAPS}
          onChange={(v) => update({ gap: v })}
          placeholder={placeholderFor('gap')}
        />
      </PanelRow>
    </section>
  )
}
