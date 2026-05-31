import { useEditor } from '@craftjs/core'
import { useCallback, useMemo } from 'react'
import { z } from 'zod'
import { getComponentByDisplayName } from '@/registry/registry'
import { ImagePicker } from '../assets/ImagePicker'
import { PropField } from './fields/PropField'
import { PanelRow } from './shared/PanelRow'

// Phase 11 § 3.10 — canonical props that should render the image
// picker instead of a plain text input, keyed by canonical id →
// prop key. Extend as future canonicals gain image fields
// (Avatar.src, Card.cover, …).
const IMAGE_FIELDS: Record<string, ReadonlySet<string>> = {
  image: new Set(['src']),
}

function isImageField(canonicalId: string, field: string): boolean {
  return IMAGE_FIELDS[canonicalId]?.has(field) ?? false
}

// `currentSlide` → "Current slide", `showChevrons` → "Show chevrons",
// `aria-label` → "Aria label". Schema keys are camelCase / kebab-case in
// the source; humans want sentence case in the inspector.
function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

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
  // propsSchema is typed as z.ZodType<Props>; at runtime it's a ZodObject for
  // every canonical we author. Guard against schemas that aren't objects.
  const objectSchema =
    def?.propsSchema instanceof z.ZodObject ? def.propsSchema : null
  const shape = objectSchema
    ? (objectSchema.shape as Record<string, z.ZodType>)
    : null

  // Writing one prop only depends on the (stable) Craft actions + nodeId —
  // the value flows through the setProp updater, which always sees the latest
  // props. Memoize so the per-key handlers below stay referentially stable.
  const set = useCallback(
    (key: string, value: unknown) => {
      actions.setProp(nodeId, (props: NodeProps) => {
        if (value === undefined) {
          delete props.nodeProps[key]
        } else {
          props.nodeProps[key] = value
        }
      })
    },
    [actions, nodeId],
  )

  // Phase 17 § 8.5 — one stable `onChange` per field key. Keyed on the schema
  // key list (a stable string for a given canonical) + the stable `set`, so a
  // memoized PropField for an untouched field keeps the same `onChange`
  // identity across renders and skips its re-render + schema re-walk when a
  // sibling field changes.
  const fieldKeys = shape ? Object.keys(shape) : []
  const keySignature = fieldKeys.join('|')
  const handlers = useMemo(() => {
    const m: Record<string, (v: unknown) => void> = {}
    for (const key of keySignature ? keySignature.split('|') : []) {
      m[key] = (v) => set(key, v)
    }
    return m
  }, [keySignature, set])

  if (!def) return null
  if (!shape) {
    return (
      <section className="space-y-2">
        <div className="text-xs text-gray-400">
          {displayName}'s propsSchema isn't a ZodObject — no form generated.
        </div>
      </section>
    )
  }

  // Phase 13 § 5.2 — canonicals can opt fields out of the auto-generated
  // form when a dedicated inspector panel owns the field's UX (Stepper →
  // currentStep). The field stays in propsSchema and is still readable
  // / writable via setProp.
  const hiddenFields = new Set(def.hiddenPropFields ?? [])

  return (
    <section className="space-y-2">
      {Object.entries(shape)
        .filter(([key]) => !hiddenFields.has(key))
        .map(([key, fieldSchema]) => (
        <PanelRow key={key} label={humanizeKey(key)}>
          {isImageField(def.id, key) ? (
            <ImagePicker
              value={(nodeProps[key] as string | undefined) ?? ''}
              onChange={handlers[key]}
            />
          ) : (
            <PropField
              schema={fieldSchema}
              value={nodeProps[key]}
              onChange={handlers[key]}
            />
          )}
        </PanelRow>
      ))}
    </section>
  )
}
