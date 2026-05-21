import { useEditor } from '@craftjs/core'
import type { ReactNode } from 'react'
import {
  mergeTypography,
  parseTypography,
} from '@/style/tw-classes'
import type {
  FontSize,
  FontWeight,
  TextAlign,
  TextColor,
  TypographySlice,
} from '@/style/tw-classes'

const FONT_SIZES: readonly FontSize[] = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl']
const FONT_WEIGHTS: readonly FontWeight[] = ['light', 'normal', 'medium', 'semibold', 'bold']
const TEXT_ALIGNS: readonly TextAlign[] = ['left', 'center', 'right', 'justify']
const TEXT_COLORS: readonly TextColor[] = [
  'foreground',
  'primary',
  'secondary',
  'muted-foreground',
  'destructive',
  'accent-foreground',
]

type NodeProps = { style: { classes: { root: string } } }

export function TypographyPanel({ nodeId }: { nodeId: string }) {
  const { actions, classString } = useEditor((_, query) => {
    const data = query.node(nodeId).get().data
    return {
      classString: ((data.props as NodeProps).style?.classes?.root ?? '') as string,
    }
  })
  const { slice } = parseTypography(classString)

  // Read live class string from the mutator's draft, not from the render-time
  // closure — protects against a rare race where two rapid edits would otherwise
  // both use the same pre-mutation baseline.
  const update = (patch: Partial<TypographySlice>) => {
    actions.setProp(nodeId, (props: NodeProps) => {
      props.style.classes.root = mergeTypography(props.style.classes.root, patch)
    })
  }

  return (
    <section className="space-y-2">
      <div className="text-xs font-semibold tracking-wide uppercase text-gray-500">
        Typography
      </div>
      <Row label="Size">
        <Select
          value={slice.fontSize ?? ''}
          options={FONT_SIZES}
          onChange={(v) => update({ fontSize: v === '' ? undefined : (v as FontSize) })}
        />
      </Row>
      <Row label="Weight">
        <Select
          value={slice.fontWeight ?? ''}
          options={FONT_WEIGHTS}
          onChange={(v) => update({ fontWeight: v === '' ? undefined : (v as FontWeight) })}
        />
      </Row>
      <Row label="Align">
        <Select
          value={slice.textAlign ?? ''}
          options={TEXT_ALIGNS}
          onChange={(v) => update({ textAlign: v === '' ? undefined : (v as TextAlign) })}
        />
      </Row>
      <Row label="Color">
        <Select
          value={slice.textColor ?? ''}
          options={TEXT_COLORS}
          onChange={(v) => update({ textColor: v === '' ? undefined : (v as TextColor) })}
        />
      </Row>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700"
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
