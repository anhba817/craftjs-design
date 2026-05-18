import { Element, useNode } from '@craftjs/core'
import type { ReactNode } from 'react'
import { useActiveAdapter } from '../adapters/AdapterContext'
import { getComponent } from '../registry/registry'
import type { NodeStyle } from '../registry/types'

export interface CanonicalNodeProps {
  canonicalId: string
  nodeProps: Record<string, unknown>
  style: NodeStyle
  children?: ReactNode
}

export function CanonicalNode({
  canonicalId,
  nodeProps,
  style,
  children,
}: CanonicalNodeProps) {
  const def = getComponent(canonicalId)
  if (!def) {
    throw new Error(`canonical id not in registry: ${canonicalId}`)
  }
  const adapter = useActiveAdapter()
  const Impl = adapter.components[canonicalId]
  if (!Impl) {
    throw new Error(
      `adapter '${adapter.id}' missing impl for canonical id '${canonicalId}'`,
    )
  }

  const {
    connectors: { connect, drag },
  } = useNode()

  // `display: contents` makes the wrapper transparent in the layout tree, so
  // Craft.js's connectors target the adapter's rendered element directly while
  // we still get a single ref to attach connect/drag to. Flagged in PHASE1_PLAN.md
  // risk #2 — swap to forwardRef on impls if selection/drop indicators misalign.
  return (
    <div
      ref={(el) => {
        if (el) connect(drag(el))
      }}
      style={{ display: 'contents' }}
    >
      <Impl canonicalId={canonicalId} props={nodeProps} style={style}>
        {def.isCanvas ? (
          <Element id="children" is="div" canvas>
            {children}
          </Element>
        ) : (
          children
        )}
      </Impl>
    </div>
  )
}
