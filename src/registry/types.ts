import type { z } from "zod";

export type CanonicalId = string;

export type CanonicalCategory =
  | "layout"
  | "input"
  | "display"
  | "navigation"
  | "feedback"
  | "media"
  | "content";

export interface NodeStyle {
  classes: Record<string, string>;
  responsive?: Record<string, Record<string, string>>;
  // Inline CSS for arbitrary values at the BASE breakpoint.
  // Slot → CSS-property → value.
  // When the slot has no responsiveInline entries, these are emitted via the
  // React style prop (fast path). When the slot ALSO has responsiveInline,
  // CanonicalNode promotes both base and responsive into a generated CSS class
  // with @media rules so the responsive overrides aren't beaten by the
  // inline-style attribute's specificity.
  inline?: Record<string, Record<string, string>>;
  // Phase 6 — responsive arbitrary inline.
  // Breakpoint → slot → CSS-property → value. The breakpoint key is one of
  // 'sm' | 'md' | 'lg' | 'xl' | '2xl' (Tailwind's defaults). Values apply at
  // and above the named breakpoint via @media (min-width: …) rules generated
  // at render time by composeResponsiveInline + CanonicalNode's <style> block.
  responsiveInline?: Record<string, Record<string, Record<string, string>>>;
}

// Inspector panel ids. Each canonical declares (or defaults) which panels apply.
export type PanelId =
  | "layout"
  | "spacing"
  | "size"
  | "typography"
  | "appearance"
  | "effects"
  | "componentProps";

export interface CanonicalComponent<Props = Record<string, unknown>> {
  id: CanonicalId;
  category: CanonicalCategory;
  displayName: string;
  tags: readonly string[];
  // True if the outer node itself is a canvas (Pattern A: Box, Stack). False
  // for leaves (Button, Text) AND for multi-canvas Pattern B composites where
  // the outer node is just a wrapper — its named sub-slots are the canvases.
  isCanvas: boolean;
  styleSlots: readonly string[];
  // Phase 6 — Pattern B multi-canvas. When set, CanonicalNode generates one
  // <Element canvas id={slot}/> wrapper per slot and passes them to the
  // adapter impl via `slotChildren`. When unset, behavior derives from
  // `isCanvas`: true → ['root'] (the outer node IS the canvas, children come
  // through the React children prop); false → [] (no drop zones).
  canvasSlots?: readonly string[];
  propsSchema: z.ZodType<Props>;
  defaults: {
    props: Props;
    style: NodeStyle;
  };
  // Explicit list of inspector panels that apply to this canonical. If
  // undefined, getApplicablePanels() in registry.ts derives a sensible default
  // from category + isCanvas. Use this field to override defaults, e.g., Button
  // omitting 'typography' because shadcn's flex centering ignores text utils.
  applicablePanels?: readonly PanelId[];
}
