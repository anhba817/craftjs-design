import { z } from "zod";
import { registerComponent } from "../registry";

export const boxPropsSchema = z.object({});
export type BoxProps = z.infer<typeof boxPropsSchema>;

registerComponent<BoxProps>({
  id: "box",
  category: "layout",
  displayName: "Box",
  tags: ["container", "div", "frame"],
  isCanvas: true,
  styleSlots: ["root"],
  propsSchema: boxPropsSchema,
  defaults: {
    props: {},
    style: {
      classes: {
        root: "min-h-16 p-4 border border-dashed border-canvas-border rounded-md",
      },
    },
  },
});
