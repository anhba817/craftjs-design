import type { CSSProperties } from 'react'
import { getCanvasSlots } from '../registry/registry'
import type { CanonicalComponent, NodeStyle } from '../registry/types'
import {
  readBucketClasses,
  readBucketInline,
  type StyleState,
} from '../style/dimensions'
import { composeInlineStyle } from '../style/inline'
import { composeResponsive } from '../style/responsive'
import { composeResponsiveInline } from '../style/responsive-inline'

// Phase 18 § 3 — the pure "node render model".
//
// Everything `CanonicalNode` needs to render a node that DOESN'T depend on
// React, Craft, or the active adapter: the per-slot composed class strings +
// inline styles, the promoted responsive-inline `<style>` text, and the
// canvas-slot metadata. Extracted from `CanonicalNode` so the composition
// logic (responsive bucket promotion, pseudo-state preview overlay, slot
// derivation) is unit-testable without a DOM — and so the React component
// reads as wiring (useNode + connectors + adapter handoff).
//
// What stays in the component (adapter/React-dependent, NOT here):
//   - `adapter.classMap(rootClassString, …)` + the inlineStyle merge,
//   - the `<Element canvas>` slot children (needs the Craft resolver + memo),
//   - the `previewBucket` selector (reads editor store) — its RESULT is an
//     input here.

/** The edited pseudo-state bucket to preview on the selected node (render-only). */
export interface PreviewBucket {
  bp: string
  state: StyleState
}

export interface NodeRenderModel {
  /** slot id → composed Tailwind class string (base + responsive + preview). */
  composedClasses: Record<string, string>
  /** slot id → inline style object (arbitrary values not promoted to a class). */
  composedInlineStyles: Record<string, CSSProperties>
  /** Concatenated `@media`/promoted-inline CSS to emit in a `<style>` tag. */
  responsiveInlineCSS: string
  /** Convenience: `composedClasses.root ?? ''` (fed to the adapter classMap). */
  rootClassString: string
  /** Resolved canvas slot ids for this node (Pattern B; [] / ['root'] otherwise). */
  canvasSlots: readonly string[]
  /** True when the canonical declares `canvasSlots` (drives slotChildren). */
  usesSlotChildren: boolean
}

/**
 * Compose the per-slot class/style maps + canvas-slot metadata for a node.
 * Pure: identical inputs → identical output, no side effects.
 *
 * @param def         the canonical definition (its `styleSlots` / `canvasSlots`)
 * @param nodeProps   the node's props (only used to resolve dynamic canvasSlots)
 * @param style       the node's persisted `NodeStyle`
 * @param previewBucket  when set, the edited pseudo-state bucket to overlay
 *                       UNPREFIXED so the designer sees the hover/focus/active
 *                       look while editing it (never written to the document)
 */
export function buildNodeRenderModel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  def: CanonicalComponent<any>,
  nodeProps: Record<string, unknown>,
  style: NodeStyle,
  previewBucket: PreviewBucket | null,
): NodeRenderModel {
  // Every slot the canonical declares gets a full responsive composition +
  // inline merge. Pattern A (one 'root' slot) yields a single-entry map;
  // Pattern B (Card, Tabs, …) gets an entry per named region.
  const composedClasses: Record<string, string> = {}
  const composedInlineStyles: Record<string, CSSProperties> = {}
  const responsiveInlineCSSParts: string[] = []
  for (const slot of def.styleSlots) {
    const baseClasses = composeResponsive(style, slot)
    // When the slot has any responsiveInline entry, ALL of its inline (base +
    // responsive) is promoted to a generated CSS class. The base moves out of
    // the inline-style attribute so its specificity doesn't beat the @media
    // rule. With no responsive entry, the inline-style fast path stays.
    const ri = composeResponsiveInline(style, slot)
    composedClasses[slot] = ri.className
      ? `${baseClasses} ${ri.className}`.trim()
      : baseClasses
    if (ri.css) responsiveInlineCSSParts.push(ri.css)
    if (!ri.consumesBaseInline) {
      const inline = composeInlineStyle(style, slot)
      if (inline) composedInlineStyles[slot] = inline
    }
    // Pseudo-state preview: the edited bucket's classes are stored prefixed
    // (`hover:bg-primary`) so they only apply on real hover; here we also
    // apply them UNPREFIXED so the designer previews the state while editing.
    if (previewBucket) {
      const pc = readBucketClasses(
        style,
        slot,
        previewBucket.bp,
        previewBucket.state,
      )
      if (pc) composedClasses[slot] = `${composedClasses[slot]} ${pc}`.trim()
      const pi = readBucketInline(
        style,
        slot,
        previewBucket.bp,
        previewBucket.state,
      )
      if (Object.keys(pi).length > 0) {
        composedInlineStyles[slot] = {
          ...composedInlineStyles[slot],
          ...(pi as CSSProperties),
        }
      }
    }
  }

  const responsiveInlineCSS = responsiveInlineCSSParts.join('\n')
  const rootClassString = composedClasses.root ?? ''
  const canvasSlots = getCanvasSlots(def, nodeProps)
  const usesSlotChildren = def.canvasSlots !== undefined

  return {
    composedClasses,
    composedInlineStyles,
    responsiveInlineCSS,
    rootClassString,
    canvasSlots,
    usesSlotChildren,
  }
}
