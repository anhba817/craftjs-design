// Phase 21 — registry introspection for headless/AI consumers. Each
// canonical's zod props schema converts to JSON Schema (zod 4's
// `z.toJSONSchema`), so an MCP client can present typed tool inputs and an
// agent can see exactly what props a component takes before adding it.
import { z } from 'zod'
import { getApplicablePanels, getComponent, listComponents } from '@/registry/registry'

export interface CanonicalDescription {
  id: string
  displayName: string
  category: string
  tags: readonly string[]
  /** Container that accepts `children` (Pattern A). */
  isCanvas: boolean
  /** Hidden canonicals are spawned structurally (table-cell) — don't add directly. */
  hidden: boolean
  styleSlots: readonly string[]
  /**
   * Pattern B canvas slots: a fixed list (Card), `'dynamic'` when the list
   * depends on props (Tabs/Table — resolve via `slotKeysFor`), or undefined
   * for single-canvas/leaf canonicals.
   */
  canvasSlots?: readonly string[] | 'dynamic'
  /** When set, slot containers are this canonical (Table → 'table-cell'). */
  slotComponent?: string
  applicablePanels: readonly string[]
  defaults: { props: Record<string, unknown>; style: unknown }
  /** JSON Schema for the canonical's props (undefined if unrepresentable). */
  propsJsonSchema?: unknown
}

function describe(id: string): CanonicalDescription | null {
  const def = getComponent(id)
  if (!def) return null
  let propsJsonSchema: unknown
  try {
    propsJsonSchema = z.toJSONSchema(def.propsSchema)
  } catch {
    propsJsonSchema = undefined
  }
  return {
    id: def.id,
    displayName: def.displayName,
    category: def.category,
    tags: def.tags,
    isCanvas: def.isCanvas,
    hidden: !!def.hidden,
    styleSlots: def.styleSlots,
    canvasSlots:
      def.canvasSlots === undefined
        ? undefined
        : typeof def.canvasSlots === 'function'
          ? 'dynamic'
          : def.canvasSlots,
    slotComponent: def.slotComponent,
    applicablePanels: getApplicablePanels(def),
    defaults: {
      props: def.defaults.props as Record<string, unknown>,
      style: def.defaults.style,
    },
    propsJsonSchema,
  }
}

/** Describe every registered canonical (including hidden structural ones). */
export function describeCanonicals(): CanonicalDescription[] {
  return listComponents()
    .map((d) => describe(d.id))
    .filter((d): d is CanonicalDescription => d !== null)
}

/** Describe one canonical by id. Returns null when unregistered. */
export function describeCanonical(id: string): CanonicalDescription | null {
  return describe(id)
}
