import { useEditor } from '@craftjs/core'
import { z } from 'zod'
import { getComponentByDisplayName } from '@/registry/registry'
import { PanelRow } from './shared/PanelRow'
import { ValueSelect } from './shared/ValueSelect'

// Auto-generates form controls from each canonical's Zod `propsSchema`.
//
// Today's dispatch covers the four Zod kinds Phase 4 canonicals use:
//   ZodEnum    → ValueSelect bound to schema.options
//   ZodString  → text input
//   ZodBoolean → checkbox
//   ZodNumber  → number input
//
// Anything else renders a labeled "unsupported" badge so the user sees there's
// a gap and the developer sees what to add next. The dispatch uses
// `instanceof z.Zod*` — stable v3→v4 — over reaching into `._def`.

type NodeProps = { nodeProps: Record<string, unknown> }

export function PropsPanel({ nodeId }: { nodeId: string }) {
  const { actions, displayName, nodeProps } = useEditor((_, q) => {
    const data = q.node(nodeId).get().data
    return {
      displayName: data.displayName,
      nodeProps: (data.props as NodeProps).nodeProps,
    }
  })

  const def = getComponentByDisplayName(displayName)
  if (!def) return null

  // `propsSchema` is typed as `z.ZodType<Props>` on the registry side; at
  // runtime it's a ZodObject for every canonical we author. Guard against
  // schemas that aren't objects (e.g., a future canonical with a top-level
  // union schema would render as unsupported).
  const schema = def.propsSchema as unknown
  if (!(schema instanceof z.ZodObject)) {
    return (
      <section className="space-y-2">
        <div className="text-xs text-gray-400">
          {displayName}'s propsSchema isn't a ZodObject — no form generated.
        </div>
      </section>
    )
  }

  const shape = schema.shape as Record<string, z.ZodType>

  const set = (key: string, value: unknown) => {
    actions.setProp(nodeId, (props: NodeProps) => {
      if (value === undefined) {
        delete props.nodeProps[key]
      } else {
        props.nodeProps[key] = value
      }
    })
  }

  return (
    <section className="space-y-2">
      {Object.entries(shape).map(([key, fieldSchema]) => (
        <PanelRow key={key} label={key}>
          <PropField
            schema={fieldSchema}
            value={nodeProps[key]}
            onChange={(v) => set(key, v)}
          />
        </PanelRow>
      ))}
    </section>
  )
}

function PropField({
  schema,
  value,
  onChange,
}: {
  schema: z.ZodType
  value: unknown
  onChange: (v: unknown) => void
}) {
  if (schema instanceof z.ZodEnum) {
    return (
      <ValueSelect
        value={(value as string | undefined) ?? ''}
        options={schema.options as readonly string[]}
        onChange={(v) => onChange(v)}
      />
    )
  }
  if (schema instanceof z.ZodString) {
    return (
      <input
        type="text"
        value={(value as string | undefined) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700"
      />
    )
  }
  if (schema instanceof z.ZodBoolean) {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
    )
  }
  if (schema instanceof z.ZodNumber) {
    return (
      <input
        type="number"
        value={(value as number | undefined) ?? ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? undefined : Number(e.target.value))
        }
        className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700"
      />
    )
  }
  return (
    <span className="text-xs text-destructive">
      unsupported Zod kind ({schema.constructor.name})
    </span>
  )
}
