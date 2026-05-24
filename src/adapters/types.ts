import type { CSSProperties, ComponentType, ReactNode } from "react";
import type { CanonicalId, NodeStyle } from "../registry/types";

export interface ClassMapResult {
  // The className the impl should put on its root element (typically Tailwind).
  className?: string;
  // MUI's sx prop shape. Plain object; adapter impls that use sx-style libraries
  // receive this and forward it to their rendered component.
  sx?: Record<string, unknown>;
  // Inline CSS. Renamed from `style` to avoid colliding with the existing
  // `style: NodeStyle` field on AdapterRenderProps.
  inlineStyle?: CSSProperties;
}

// Translates a node's canonical Tailwind class string into adapter-native
// render output. The adapter impl receives the result via AdapterRenderProps.
export type ClassMapFn = (
  canonicalClasses: string,
  canonicalId: CanonicalId,
) => ClassMapResult;

export interface AdapterRenderProps {
  canonicalId: CanonicalId;
  props: Record<string, unknown>;
  // Canonical style data as authored by the inspector. Pass through to impls
  // that read Tailwind classes directly (shadcn). Impls that don't (MUI) ignore
  // this in favor of `className` / `sx` / `inlineStyle` below, which come from
  // the active adapter's classMap (or default passthrough).
  style: NodeStyle;
  children?: ReactNode;
  // Attach this ref callback to the adapter's outermost DOM element. The editor
  // uses it to wire Craft.js connect/drag — without it, drop-target hit-testing
  // can't disambiguate nested instances of the same component.
  rootRef?: (el: HTMLElement | null) => void;

  // ----- Populated by CanonicalNode from adapter.classMap (or default) -----
  // For Pattern A (single-slot) canonicals, impls usually just read className +
  // inlineStyle (the root composition). For Pattern B canonicals with named
  // sub-slots (Card's header/body/footer, Tabs' tabs/content), impls read from
  // composedClasses[slot] / composedInlineStyles[slot] to apply per-slot
  // styling. The root entry of each map equals className / inlineStyle.
  className?: string;
  sx?: Record<string, unknown>;
  inlineStyle?: CSSProperties;
  composedClasses?: Record<string, string>;
  composedInlineStyles?: Record<string, CSSProperties>;
}

export interface Adapter {
  id: string;
  displayName: string;
  components: Partial<Record<CanonicalId, ComponentType<AdapterRenderProps>>>;

  // ----- Phase 3 additions. All optional. -----

  // Declarative wrapper rendered around the entire canvas when this adapter is
  // active. Use for libraries that need a global React provider (MUI's
  // ThemeProvider, Chakra's CSSReset, etc.). Defaults to a Fragment passthrough.
  Wrapper?: ComponentType<{ children: ReactNode }>;

  // CSS variables this adapter wants injected when active. Phase 3 ships the
  // SDK field but the runtime injection is deferred to Phase 5 (Valve B in
  // PHASE3_PLAN.md) — MUI's cssVariables mode reads our shadcn variables
  // directly, making explicit injection unnecessary for the first two adapters.
  themeTokens?: Record<string, string>;

  // Rewrite canonical Tailwind classes into adapter-native render props.
  // CanonicalNode invokes this once per render. Adapters without one get
  // a default `{ className: <canonical class string> }` passthrough.
  classMap?: ClassMapFn;

  // Imperative one-shot hooks. Prefer Wrapper for declarative needs. Use these
  // for side effects that can't be expressed declaratively (e.g., calling a
  // library's global init function).
  mount?: () => void;
  unmount?: () => void;
}
