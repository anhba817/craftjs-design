import {
  SIZE_VALUES,
  mergeSize,
  parseSize,
} from '@/style/tw-classes'
import type { SizeSlice, SizeValue } from '@/style/tw-classes'
import { PanelRow } from './shared/PanelRow'
import { ValueSelect } from './shared/ValueSelect'
import { useNodeClasses } from './shared/useNodeClasses'

export function SizePanel({ nodeId }: { nodeId: string }) {
  const { classString, writeClasses } = useNodeClasses(nodeId)
  const { slice } = parseSize(classString)
  const update = (patch: Partial<SizeSlice>) => {
    writeClasses(mergeSize(classString, patch))
  }

  return (
    <section className="space-y-2">
      <div className="text-xs font-semibold tracking-wide uppercase text-gray-500">
        Size
      </div>
      <PanelRow label="Width">
        <ValueSelect
          value={slice.w ?? ''}
          options={SIZE_VALUES}
          onChange={(v) => update({ w: v as SizeValue | undefined })}
        />
      </PanelRow>
      <PanelRow label="Height">
        <ValueSelect
          value={slice.h ?? ''}
          options={SIZE_VALUES}
          onChange={(v) => update({ h: v as SizeValue | undefined })}
        />
      </PanelRow>
      <PanelRow label="Min W">
        <ValueSelect
          value={slice['min-w'] ?? ''}
          options={SIZE_VALUES}
          onChange={(v) => update({ 'min-w': v as SizeValue | undefined })}
        />
      </PanelRow>
      <PanelRow label="Min H">
        <ValueSelect
          value={slice['min-h'] ?? ''}
          options={SIZE_VALUES}
          onChange={(v) => update({ 'min-h': v as SizeValue | undefined })}
        />
      </PanelRow>
      <PanelRow label="Max W">
        <ValueSelect
          value={slice['max-w'] ?? ''}
          options={SIZE_VALUES}
          onChange={(v) => update({ 'max-w': v as SizeValue | undefined })}
        />
      </PanelRow>
      <PanelRow label="Max H">
        <ValueSelect
          value={slice['max-h'] ?? ''}
          options={SIZE_VALUES}
          onChange={(v) => update({ 'max-h': v as SizeValue | undefined })}
        />
      </PanelRow>
    </section>
  )
}
