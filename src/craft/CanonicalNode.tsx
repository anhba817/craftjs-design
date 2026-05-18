import { useNode } from '@craftjs/core'
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

  // Attach connect/drag directly to the impl's root DOM element via rootRef.
  // A `display: contents` wrapper would break Craft's drop-target hit-testing
  // because it has no bounding box — nested instances would all route drops to
  // the outermost ancestor. See PHASE1_PLAN.md risk #2.
  return (
    <Impl
      canonicalId={canonicalId}
      props={nodeProps}
      style={style}
      rootRef={(el) => {
        if (el) connect(drag(el))
      }}
    >
      {children}
    </Impl>
  )
}
