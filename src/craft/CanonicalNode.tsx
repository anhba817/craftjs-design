import { useNode } from '@craftjs/core'
import type { CSSProperties, ReactNode } from 'react'
import { useActiveAdapter } from '../adapters/AdapterContext'
import type { ClassMapResult } from '../adapters/types'
import { getComponent } from '../registry/registry'
import type { NodeStyle } from '../registry/types'
import { composeInlineStyle } from '../style/inline'
import { composeResponsive } from '../style/responsive'

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
  // The placeholder lets users swap adapters or remove the node without
  // crashing. Phase 5 fills MUI coverage gaps as part of adapter parity.
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

  // Compose per-slot maps. Every slot the canonical declares gets a full
  // responsive composition + inline merge. Pattern A canonicals (one slot
  // named 'root') get a single-entry map; Pattern B canonicals (Card, Tabs)
  // get entries for each named region.
  //
  // The `className` / `inlineStyle` fields below mirror `composedClasses.root`
  // / `composedInlineStyles.root` for backwards compatibility with Pattern A
  // impls written before Pattern B existed.
  const composedClasses: Record<string, string> = {}
  const composedInlineStyles: Record<string, CSSProperties> = {}
  for (const slot of def.styleSlots) {
    composedClasses[slot] = composeResponsive(style, slot)
    const inline = composeInlineStyle(style, slot)
    if (inline) composedInlineStyles[slot] = inline
  }

  // Root-slot classMap output. Adapters with classMap receive the composed
  // root string; non-root slot composition isn't passed through classMap
  // because the per-slot adapter-native rewriting isn't well-defined yet
  // (Phase 6 if any adapter actually needs it).
  const rootClassString = composedClasses.root ?? ''
  const styleProps: ClassMapResult = adapter.classMap
    ? adapter.classMap(rootClassString, canonicalId)
    : { className: rootClassString }

  // Merge classMap's inlineStyle with user's arbitrary root-slot inline.
  // User picks win.
  const rootInline = composedInlineStyles.root
  const inlineStyle = rootInline
    ? { ...styleProps.inlineStyle, ...rootInline }
    : styleProps.inlineStyle

  return (
    <Impl
      canonicalId={canonicalId}
      props={nodeProps}
      style={style}
      rootRef={attachRef}
      className={styleProps.className}
      sx={styleProps.sx}
      inlineStyle={inlineStyle}
      composedClasses={composedClasses}
      composedInlineStyles={composedInlineStyles}
    >
      {children}
    </Impl>
  )
}
