import {
  BLURS,
  OPACITIES,
  SHADOWS,
  mergeEffects,
  parseEffects,
} from '@/style/tw-classes'
import type {
  Blur,
  EffectsSlice,
  Opacity,
  Shadow,
} from '@/style/tw-classes'
import { PanelRow } from './shared/PanelRow'
import { ValueSelect } from './shared/ValueSelect'
import { useNodeClasses } from './shared/useNodeClasses'

// 'default' sentinel for bare `shadow` / `blur` joins the value enum so users
// can pick "default shadow" without having to pick a specific size.
const SHADOW_OPTIONS = ['default', ...SHADOWS] as const
const BLUR_OPTIONS = ['default', ...BLURS] as const

export function EffectsPanel({ nodeId }: { nodeId: string }) {
  const { classString, writeClasses } = useNodeClasses(nodeId)
  const { slice } = parseEffects(classString)
  const update = (patch: Partial<EffectsSlice>) => {
    writeClasses(mergeEffects(classString, patch))
  }

  return (
    <section className="space-y-2">
      <PanelRow label="Shadow">
        <ValueSelect
          value={slice.shadow ?? ''}
          options={SHADOW_OPTIONS}
          onChange={(v) => update({ shadow: v as Shadow | undefined })}
        />
      </PanelRow>
      <PanelRow label="Opacity">
        <ValueSelect
          value={slice.opacity ?? ''}
          options={OPACITIES}
          onChange={(v) => update({ opacity: v as Opacity | undefined })}
        />
      </PanelRow>
      <PanelRow label="Blur">
        <ValueSelect
          value={slice.blur ?? ''}
          options={BLUR_OPTIONS}
          onChange={(v) => update({ blur: v as Blur | undefined })}
        />
      </PanelRow>
    </section>
  )
}
