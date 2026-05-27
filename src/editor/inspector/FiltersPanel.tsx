import { FILTER_FNS, parseFunctionList, setFunctionArg } from '@/style/cssFunctions'
import { mergeSlices } from './shared/mergeSlices'
import { FlexibleSelect } from './shared/FlexibleSelect'
import { PanelRow } from './shared/PanelRow'
import { useNodeClassesMulti } from './shared/useNodeClassesMulti'

// Phase 12 § 4.5 — filters as a composed inline `filter` string. This
// panel owns the ENTIRE `filter` property (one CSS property holds all
// functions), so blur lives here too — it moved out of the Effects
// panel to avoid two panels fighting over `filter`. Each field is a
// FlexibleSelect (preset OR custom CSS value).

const FIELDS: ReadonlyArray<{ fn: (typeof FILTER_FNS)[number]; label: string; presets: readonly string[] }> = [
  { fn: 'blur', label: 'Blur', presets: ['0', '2px', '4px', '8px', '16px', '24px'] },
  { fn: 'brightness', label: 'Brightness', presets: ['1', '1.1', '1.25', '1.5', '2', '0.75', '0.5'] },
  { fn: 'contrast', label: 'Contrast', presets: ['1', '1.25', '1.5', '2', '0.75', '0.5'] },
  { fn: 'saturate', label: 'Saturate', presets: ['1', '1.5', '2', '0.5', '0'] },
  { fn: 'grayscale', label: 'Grayscale', presets: ['0', '50%', '100%'] },
  { fn: 'invert', label: 'Invert', presets: ['0', '100%'] },
  { fn: 'sepia', label: 'Sepia', presets: ['0', '50%', '100%'] },
  {
    fn: 'drop-shadow',
    label: 'Drop Shadow',
    presets: [
      '0 1px 1px rgb(0 0 0 / 0.05)',
      '0 4px 3px rgb(0 0 0 / 0.07)',
      '0 10px 8px rgb(0 0 0 / 0.04)',
    ],
  },
]

export function FiltersPanel({
  nodeIds,
  slot = 'root',
}: {
  nodeId: string
  nodeIds: readonly string[]
  slot?: string
}) {
  const { inlineStyles, writeInlineFn } = useNodeClassesMulti(nodeIds, slot)
  const perNodeMaps = inlineStyles.map((s) => parseFunctionList(s.filter ?? ''))
  const { merged, mixed } = mergeSlices(perNodeMaps)

  const setFn = (fn: string, arg: string) => {
    writeInlineFn('filter', (current) =>
      setFunctionArg(current, FILTER_FNS, fn, arg),
    )
  }

  return (
    <section className="space-y-2">
      {FIELDS.map(({ fn, label, presets }) => (
        <PanelRow key={fn} label={label}>
          <FlexibleSelect
            value={mixed.has(fn) ? '' : (merged[fn] ?? '')}
            presets={presets}
            onChange={(v) => setFn(fn, v)}
            placeholder={mixed.has(fn) ? '— Mixed' : undefined}
          />
        </PanelRow>
      ))}
    </section>
  )
}
