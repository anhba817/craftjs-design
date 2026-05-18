import type { ComponentType, ReactNode } from "react";
import type { CanonicalId, NodeStyle } from "../registry/types";

export interface AdapterRenderProps {
  canonicalId: CanonicalId;
  props: Record<string, unknown>;
  style: NodeStyle;
  children?: ReactNode;
  // Attach this ref callback to the adapter's outermost DOM element. The editor
  // uses it to wire Craft.js connect/drag — without it, drop-target hit-testing
  // can't disambiguate nested instances of the same component.
  rootRef?: (el: HTMLElement | null) => void;
}

export interface Adapter {
  id: string;
  displayName: string;
  components: Partial<Record<CanonicalId, ComponentType<AdapterRenderProps>>>;
}
