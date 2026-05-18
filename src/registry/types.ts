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
}
