import type { ComponentType } from 'react'
import { getRegistryVersion, listComponents } from '../registry/registry'
import { CanonicalNode } from './CanonicalNode'
import type { CanonicalNodeProps } from './CanonicalNode'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Resolver = Record<string, ComponentType<any>>

let cached: Resolver | null = null
let cachedAtVersion = -1

// Lazy singleton — both Editor and Toolbox call this so they share one set of
// bound component instances. Phase 7: the cache is invalidated when the
// registry version bumps (register / unregister post-mount), so hot canonical
// reloads pick up new entries without a reload. Identity changes only when
// the registry actually changes — re-renders with no registry mutation reuse
// the cached resolver.
export function getResolver(): Resolver {
  const v = getRegistryVersion()
  if (!cached || cachedAtVersion !== v) {
    cached = buildResolver()
    cachedAtVersion = v
  }
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
