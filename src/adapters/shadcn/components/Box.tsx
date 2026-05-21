import { cn } from "@/lib/utils";
import type { AdapterRenderProps } from "../../types";

export function ShadcnBox({ style, children, rootRef }: AdapterRenderProps) {
  return (
    <div ref={rootRef} className={cn(style.classes.root)}>
      {children}
    </div>
  );
}
