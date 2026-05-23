import { useNode } from '@craftjs/core'
import type { ReactNode } from 'react'
import { useActiveAdapter } from '../adapters/AdapterContext'
import type { ClassMapResult } from '../adapters/types'
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

  const {
    connectors: { connect, drag },
  } = useNode()

  const attachRef = (el: HTMLElement | null) => {
    if (el) connect(drag(el))
  }

  // Adapter coverage gap: render a labeled placeholder instead of throwing.
  // Phase 3 ships MUI with only button + input impls; selecting MUI with a Box
  // on the canvas hits this branch. The placeholder is the user's signal that
  // the active adapter doesn't render this canonical — they can swap adapters
  // or replace the node. Phase 5 fills coverage gaps.
  if (!Impl) {
    return (
      <div
        ref={attachRef}
        className="inline-block rounded border border-dashed border-destructive/50 bg-destructive/5 px-2 py-1 text-xs text-destructive"
      >
        {def.displayName} — no impl in adapter "{adapter.displayName}"
      </div>
    )
  }

  // classMap rewrites canonical Tailwind classes into adapter-native render
  // props. Adapters without one get a default className passthrough.
  const styleProps: ClassMapResult = adapter.classMap
    ? adapter.classMap(style.classes.root, canonicalId)
    : { className: style.classes.root }

  return (
    <Impl
      canonicalId={canonicalId}
      props={nodeProps}
      style={style}
      rootRef={attachRef}
      className={styleProps.className}
      sx={styleProps.sx}
      inlineStyle={styleProps.inlineStyle}
    >
      {children}
    </Impl>
  )
}
