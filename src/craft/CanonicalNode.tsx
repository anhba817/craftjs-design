import { Element, useNode } from '@craftjs/core'
import type { CSSProperties, ReactNode } from 'react'
import { useActiveAdapter } from '../adapters/AdapterContext'
import type { ClassMapResult } from '../adapters/types'
import { getCanvasSlots, getComponent } from '../registry/registry'
import type { NodeStyle } from '../registry/types'
import { composeInlineStyle } from '../style/inline'
import { composeResponsive } from '../style/responsive'
import { composeResponsiveInline } from '../style/responsive-inline'

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
    id: nodeId,
    connectors: { connect, drag },
  } = useNode()

  const attachRef = (el: HTMLElement | null) => {
    if (el) {
      connect(drag(el))
      // Phase 9 § 1.4 — every canvas node is programmatically focusable so
      // CanvasKeyboardRegion can move focus across the tree with arrow keys.
      // tabindex=-1 keeps the node out of the natural tab order; the region
      // wrapper is the single tab stop.
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '-1')
      }
      // Phase 11 § 3.12 — stamp the Craft node id onto the DOM so the
      // right-click context menu can resolve event.target back to a
      // node id (Craft itself doesn't add a data attribute; it tracks
      // node identity through the React tree). NodeContextMenu walks
      // up from event.target looking for this attribute on contextmenu.
      el.setAttribute('data-craft-node-id', nodeId)
    }
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
  const responsiveInlineCSSParts: string[] = []
  for (const slot of def.styleSlots) {
    const baseClasses = composeResponsive(style, slot)
    // Phase 6: when the slot has any responsiveInline entry, ALL of its inline
    // (base + responsive) gets promoted to a generated CSS class. The base
    // moves out of the inline-style attribute so its specificity doesn't beat
    // the @media rule. When there's no responsive entry, the inline-style
    // attribute fast path stays in place.
    const ri = composeResponsiveInline(style, slot)
    composedClasses[slot] = ri.className
      ? `${baseClasses} ${ri.className}`.trim()
      : baseClasses
    if (ri.css) responsiveInlineCSSParts.push(ri.css)
    if (!ri.consumesBaseInline) {
      const inline = composeInlineStyle(style, slot)
      if (inline) composedInlineStyles[slot] = inline
    }
  }
  const responsiveInlineCSS = responsiveInlineCSSParts.join('\n')

  // Root-slot classMap output. Adapters with classMap receive the composed
  // root string; non-root slot composition isn't passed through classMap
  // because the per-slot adapter-native rewriting isn't well-defined yet
  // (Phase 6 if any adapter actually needs it).
  const rootClassString = composedClasses.root ?? ''
  const styleProps: ClassMapResult = adapter.classMap
    ? adapter.classMap(rootClassString, canonicalId)
    : { className: rootClassString }

  // Merge classMap's inlineStyle with user's arbitrary root-slot inline.
  // User picks win. composedInlineStyles.root may be undefined when responsive
  // inline promoted the slot to the CSS-class path.
  const rootInline = composedInlineStyles.root
  const inlineStyle = rootInline
    ? { ...styleProps.inlineStyle, ...rootInline }
    : styleProps.inlineStyle

  // Pattern B multi-canvas: when the canonical declares an explicit
  // `canvasSlots` list (e.g. Card with header/body/footer), generate one
  // <Element canvas id={slot}/> wrapper per slot. Each wrapper becomes a
  // linked Craft node — its own drop zone with its own subtree. The adapter
  // impl receives the wrappers via `slotChildren` and places each one inside
  // the corresponding DOM region.
  //
  // Pattern A canvases (the legacy isCanvas:true → ['root'] case) don't get
  // slotChildren — they keep using the `children` prop populated by Craft
  // through React. That path is unchanged.
  // Phase 7 — canvasSlots can be a function for dynamic slot counts (Tabs
  // uses this: one canvas per props.tabs entry). nodeProps flows through so
  // adding/removing a tab via PropsPanel updates the slot list on next render.
  const canvasSlots = getCanvasSlots(def, nodeProps)
  const usesSlotChildren = def.canvasSlots !== undefined
  // Each Element wrapper renders as a plain <div> in the DOM (because `is="div"`).
  // We attach `canvas-slot` so global CSS in index.css can:
  //  - give every slot a sensible min-height so empty slots are still hit-test
  //    targets (shadcn's CardHeader / CardContent only have horizontal padding,
  //    so without this they collapse to 0px and can't accept drops);
  //  - render a "Drop here" hint via `:empty` for unfilled slots, so users see
  //    where to drop.
  const slotChildren: Record<string, ReactNode> | undefined = usesSlotChildren
    ? Object.fromEntries(
        canvasSlots.map((slot) => [
          slot,
          <Element
            key={slot}
            id={slot}
            is="div"
            canvas
            className="canvas-slot"
          />,
        ]),
      )
    : undefined

  return (
    <>
      {responsiveInlineCSS && <style>{responsiveInlineCSS}</style>}
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
        slotChildren={slotChildren}
      >
        {children}
      </Impl>
    </>
  )
}
