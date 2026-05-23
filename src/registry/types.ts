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
  isCanvas: boolean;
  styleSlots: readonly string[];
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
