import {
  OPACITIES,
  SHADOWS,
  mergeEffects,
  parseEffects,
} from '@/style/tw-classes'
import type { EffectsSlice, Opacity, Shadow } from '@/style/tw-classes'
import { mergeSlices } from './shared/mergeSlices'
import { PanelRow } from './shared/PanelRow'
import { ValueSelect } from './shared/ValueSelect'
import { useNodeClassesMulti } from './shared/useNodeClassesMulti'

// 'default' sentinel for bare `shadow` joins the value enum so users can pick
// "default shadow" without having to pick a specific size.
//
// Phase 12 § 4.5 — `blur` moved to the Filters panel: blur is part of the CSS
// `filter` property, which the Filters panel now owns as a composed inline
// value. Keeping blur here as a Tailwind class would fight the inline filter.
// (Legacy `blur-*` classes on existing nodes still round-trip via
// EffectsSlice.blur in tw-classes — they're just not editable from here.)
const SHADOW_OPTIONS = ['default', ...SHADOWS] as const

export function EffectsPanel({
  nodeIds,
  slot = 'root',
}: {
  nodeId: string
  nodeIds: readonly string[]
  slot?: string
}) {
  const { classStrings, writeClassesAll } = useNodeClassesMulti(nodeIds, slot)
  const slices: Record<string, string | undefined>[] = classStrings.map(
    (cs) => parseEffects(cs).slice as Record<string, string | undefined>,
  )
  const { merged, mixed } = mergeSlices(slices)
  const update = (patch: Partial<EffectsSlice>) => {
    writeClassesAll((current) => mergeEffects(current, patch))
  }
  function valueOrEmpty<T extends string>(key: string): T | '' {
    return (mixed.has(key) ? '' : (merged[key] ?? '')) as T | ''
  }
  const placeholderFor = (key: string) =>
    mixed.has(key) ? '— Mixed' : undefined

  return (
    <section className="space-y-2">
      <PanelRow label="Shadow">
        <ValueSelect<Shadow | 'default'>
          value={valueOrEmpty<Shadow | 'default'>('shadow')}
          options={SHADOW_OPTIONS}
          onChange={(v) => update({ shadow: v as Shadow | undefined })}
          placeholder={placeholderFor('shadow')}
        />
      </PanelRow>
      <PanelRow label="Opacity">
        <ValueSelect<Opacity>
          value={valueOrEmpty<Opacity>('opacity')}
          options={OPACITIES}
          onChange={(v) => update({ opacity: v })}
          placeholder={placeholderFor('opacity')}
        />
      </PanelRow>
    </section>
  )
}
