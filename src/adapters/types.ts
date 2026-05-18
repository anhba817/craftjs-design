import type { ComponentType, ReactNode } from "react";
import type { CanonicalId, NodeStyle } from "../registry/types";

export interface AdapterRenderProps {
  canonicalId: CanonicalId;
  props: Record<string, unknown>;
  style: NodeStyle;
  children?: ReactNode;
}

export interface Adapter {
  id: string;
  displayName: string;
  components: Partial<Record<CanonicalId, ComponentType<AdapterRenderProps>>>;
}
