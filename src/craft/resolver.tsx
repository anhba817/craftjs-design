import type { ComponentType } from 'react'
import { listComponents } from '../registry/registry'
import { CanonicalNode } from './CanonicalNode'
import type { CanonicalNodeProps } from './CanonicalNode'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Resolver = Record<string, ComponentType<any>>

let cached: Resolver | null = null

// Lazy singleton — both Editor and Toolbox call this so they share one set of
// bound component instances (identity matters less than displayName for
// serialization, but a single instance avoids rebuild churn on re-render).
export function getResolver(): Resolver {
  if (!cached) cached = buildResolver()
  return cached
}

// One Craft user-component per canonical id. Each is a thin thunk that delegates
// to CanonicalNode with its canonicalId bound. Keeping the Craft `displayName`
// equal to the canonical displayName means the serialized JSON references nodes
// by stable, human-readable names — and swapping adapters never invalidates
// existing documents.
export function buildResolver(): Resolver {
  const resolver: Resolver = {}
  for (const def of listComponents()) {
    const Bound = (props: Omit<CanonicalNodeProps, 'canonicalId'>) => (
      <CanonicalNode canonicalId={def.id} {...props} />
    )
    Bound.displayName = def.displayName
    ;(Bound as unknown as { craft: unknown }).craft = {
      displayName: def.displayName,
      props: {
        nodeProps: def.defaults.props,
        style: def.defaults.style,
      },
    }
    resolver[def.displayName] = Bound as ComponentType<unknown> as Resolver[string]
  }
  return resolver
}
