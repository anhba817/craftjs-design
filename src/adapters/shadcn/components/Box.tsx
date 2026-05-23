import { cn } from "@/lib/utils";
import type { AdapterRenderProps } from "../../types";

// `className` comes from CanonicalNode after composeResponsive() merges the
// base + breakpoint slices into Tailwind-prefixed utilities. Reading
// style.classes.root directly here would bypass the responsive composition.
export function ShadcnBox({ children, rootRef, className }: AdapterRenderProps) {
  return (
    <div ref={rootRef} className={cn(className)}>
      {children}
    </div>
  );
}
