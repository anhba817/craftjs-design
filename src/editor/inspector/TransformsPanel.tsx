import { TRANSFORM_FNS, parseFunctionList, setFunctionArg } from '@/style/cssFunctions'
import { mergeSlices } from './shared/mergeSlices'
import { FlexibleSelect } from './shared/FlexibleSelect'
import { PanelRow } from './shared/PanelRow'
import { useNodeClassesMulti } from './shared/useNodeClassesMulti'

// Phase 12 § 4.4 — transforms as a composed inline `transform` string
// (rotate/scale/translateX/translateY/skewX/skewY). Each field is a
// FlexibleSelect: pick a preset OR type any CSS value. Inline (not
// Tailwind classes) so custom values work and all functions compose
// into one property. See cssFunctions.ts for the rationale.

const FIELDS: ReadonlyArray<{ fn: (typeof TRANSFORM_FNS)[number]; label: string; presets: readonly string[] }> = [
  { fn: 'rotate', label: 'Rotate', presets: ['0deg', '45deg', '90deg', '180deg', '-45deg', '-90deg'] },
  { fn: 'scale', label: 'Scale', presets: ['1', '1.05', '1.1', '1.25', '1.5', '0.9', '0.75', '0.5'] },
  { fn: 'translateX', label: 'Translate X', presets: ['0', '4px', '8px', '16px', '1rem', '-8px', '50%', '-50%'] },
  { fn: 'translateY', label: 'Translate Y', presets: ['0', '4px', '8px', '16px', '1rem', '-8px', '50%', '-50%'] },
  { fn: 'skewX', label: 'Skew X', presets: ['0deg', '3deg', '6deg', '12deg', '-6deg'] },
  { fn: 'skewY', label: 'Skew Y', presets: ['0deg', '3deg', '6deg', '12deg', '-6deg'] },
]

export function TransformsPanel({
  nodeIds,
  slot = 'root',
}: {
  nodeId: string
  nodeIds: readonly string[]
  slot?: string
}) {
  const { inlineStyles, writeInlineFn } = useNodeClassesMulti(nodeIds, slot)
  // Parse each node's inline `transform` into a { fn: arg } map, then
  // merge across the selection to detect mixed values per function.
  const perNodeMaps = inlineStyles.map((s) => parseFunctionList(s.transform ?? ''))
  const { merged, mixed } = mergeSlices(perNodeMaps)

  const setFn = (fn: string, arg: string) => {
    writeInlineFn('transform', (current) =>
      setFunctionArg(current, TRANSFORM_FNS, fn, arg),
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
