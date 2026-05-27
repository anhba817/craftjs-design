import { mergeSlices } from './shared/mergeSlices'
import { FlexibleSelect } from './shared/FlexibleSelect'
import { PanelRow } from './shared/PanelRow'
import { useNodeClassesMulti } from './shared/useNodeClassesMulti'

// Phase 12 § 4.3 — transitions. Unlike transform/filter these map to
// FOUR separate CSS properties, so there's no composition problem —
// each field writes its own inline property. FlexibleSelect (preset
// OR custom). Inline so custom values (e.g. `cubic-bezier(...)`,
// `450ms`) work without arbitrary Tailwind classes.
//
// Authored transitions are document content, NOT editor chrome — the
// global prefers-reduced-motion rule does not touch them.

const FIELDS: ReadonlyArray<{ prop: string; label: string; presets: readonly string[] }> = [
  {
    prop: 'transitionProperty',
    label: 'Property',
    presets: ['all', 'colors', 'opacity', 'transform', 'background-color', 'none'],
  },
  {
    prop: 'transitionDuration',
    label: 'Duration',
    presets: ['150ms', '200ms', '300ms', '500ms', '700ms', '1000ms'],
  },
  {
    prop: 'transitionTimingFunction',
    label: 'Easing',
    presets: ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(0.4, 0, 0.2, 1)'],
  },
  {
    prop: 'transitionDelay',
    label: 'Delay',
    presets: ['0ms', '100ms', '200ms', '300ms', '500ms'],
  },
]

export function TransitionsPanel({
  nodeIds,
  slot = 'root',
}: {
  nodeId: string
  nodeIds: readonly string[]
  slot?: string
}) {
  const { inlineStyles, writeInlineAll } = useNodeClassesMulti(nodeIds, slot)
  // Merge the raw inline values per property across the selection.
  const { merged, mixed } = mergeSlices(
    inlineStyles as readonly Record<string, string>[],
  )

  return (
    <section className="space-y-2">
      {FIELDS.map(({ prop, label, presets }) => (
        <PanelRow key={prop} label={label}>
          <FlexibleSelect
            value={mixed.has(prop) ? '' : (merged[prop] ?? '')}
            presets={presets}
            onChange={(v) => writeInlineAll(prop, v === '' ? undefined : v)}
            placeholder={mixed.has(prop) ? '— Mixed' : undefined}
          />
        </PanelRow>
      ))}
    </section>
  )
}
