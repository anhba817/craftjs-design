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

  // Phase 12 § 4.2 — pseudo-class states, fully composing with
  // breakpoints (the breakpoint × state matrix). Four storage quadrants
  // total for classes (and a mirror for inline):
  //   classes                          → (base bp, base state)  [above]
  //   responsive[bp][slot]             → (bp,      base state)  [above]
  //   states[state][slot]              → (base bp, state)       [here]
  //   stateResponsive[bp][state][slot] → (bp,      state)       [here]
  // state ∈ 'hover' | 'focus' | 'active'. Emitted as Tailwind variant
  // prefixes `<bp>:<state>:<util>` (breakpoint outermost). All optional;
  // absent = pre-Phase-12 behavior, so no envelope migration needed.
  states?: Record<string, Record<string, string>>;
  stateResponsive?: Record<string, Record<string, Record<string, string>>>;
  // Inline mirror of the two state quadrants. Promoted to generated
  // `<style>` rules with `:hover` / `:focus` / `:active` selectors
  // (and `@media` wrappers for the bp×state quadrant) by
  // composeInlineCSS — the inline-style attribute can't express a
  // pseudo-class.
  stateInline?: Record<string, Record<string, Record<string, string>>>;
  stateResponsiveInline?: Record<
    string,
    Record<string, Record<string, Record<string, string>>>
  >;
}

// Built-in inspector panel ids — listed for autocomplete on
// `applicablePanels`. The type also admits arbitrary strings so SDK
// consumers (and internal custom panels like Phase 13's tableMerge) can
// be opted-in by id without extending this union.
export type BuiltinPanelId =
  | "layout"
  | "spacing"
  | "size"
  | "typography"
  | "appearance"
  | "effects"
  | "componentProps";
export type PanelId = BuiltinPanelId | (string & {});

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
  // Pattern B multi-canvas. When set, CanonicalNode generates one
  // <Element canvas id={slot}/> wrapper per slot and passes them to the
  // adapter impl via `slotChildren`. When unset, behavior derives from
  // `isCanvas`: true → ['root'] (the outer node IS the canvas, children come
  // through the React children prop); false → [] (no drop zones).
  //
  // Phase 7 — Function form supports dynamic slot counts. Tabs uses this to
  // expose one canvas per `props.tabs` entry. CanonicalNode calls the function
  // with the node's current `props` on every render, so add/remove tab via the
  // PropsPanel array editor immediately reflects in the canvas slot list.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvasSlots?: readonly string[] | ((props: any) => readonly string[]);
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

  // Phase 13 § 5.1 — when true, the canonical is registered for use as a
  // child / slot component but hidden from the Toolbox listing. Hosts and
  // composite canonicals (Table → table-cell) spawn them programmatically.
  hidden?: boolean;

  // Phase 13 § 5.1 — Pattern B multi-canvas slots can override the default
  // `<Element is="div">` wrapper with another canonical (looked up by id in
  // the registry, rendered via its resolver entry). The slot then becomes a
  // proper CanonicalNode with its own NodeStyle, applicablePanels, etc.
  // Used by Table to give every cell a TableCell canonical (per-cell
  // styling via the standard inspector panels). When unset, slots are
  // plain divs.
  slotComponent?: CanonicalId;

  // Phase 13 § 5.1 — opt out of the canvas-overlay drag-resize handles.
  // The 8-handle ResizeOverlay isn't meaningful for every node — Table
  // cells, for example, are sized by the parent Table's colWidths /
  // rowHeights, not by a per-node width/height. Default true.
  canResize?: boolean;

  // Phase 13 § 5.2 — prop-field names that the default PropsPanel should
  // SKIP. The field still lives in propsSchema (so the canonical can
  // read / write it via setProp), but the auto-generated form omits it.
  // Use when a custom inspector panel owns the field's UX — e.g. Stepper
  // hides `currentStep` because the StepperNavigator panel handles it
  // with proper bounds.
  hiddenPropFields?: readonly string[];
}
