import { cn } from "../../../utils/cn";
import type { AdapterRenderProps } from "../../types";

export function ShadcnBox({ style, children }: AdapterRenderProps) {
  return <div className={cn(style.classes.root)}>{children}</div>;
}
