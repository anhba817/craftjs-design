import { cn } from "@design/sdk";
import type { AdapterRenderProps } from "../../types";

// `className` is the composed responsive class string; `inlineStyle` holds
// arbitrary values the user picked via inspector (hex colors, custom px). Both
// are populated by CanonicalNode; the adapter just forwards them.
export function ShadcnBox({
  children,
  rootRef,
  className,
  inlineStyle,
}: AdapterRenderProps) {
  return (
    <div ref={rootRef} className={cn(className)} style={inlineStyle}>
      {children}
    </div>
  );
}
