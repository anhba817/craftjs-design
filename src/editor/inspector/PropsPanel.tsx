import { useEditor } from '@craftjs/core'
import { z } from 'zod'
import { getComponentByDisplayName } from '@/registry/registry'
import { PropField } from './fields/PropField'
import { PanelRow } from './shared/PanelRow'

// Auto-generates form controls from each canonical's Zod propsSchema. The
// recursive PropField dispatcher in ./fields/ handles every kind we support:
// ZodEnum, ZodString, ZodBoolean, ZodNumber, ZodArray, ZodObject. Unknown
// kinds render a labeled badge so gaps are visible.

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

  // propsSchema is typed as z.ZodType<Props>; at runtime it's a ZodObject for
  // every canonical we author. Guard against schemas that aren't objects.
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
