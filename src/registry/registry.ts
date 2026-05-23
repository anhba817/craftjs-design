import type { CanonicalComponent, CanonicalId, PanelId } from "./types";

// `any` is intentional: the registry stores heterogeneous components keyed by id.
// Public reads narrow back to the caller's generic via getComponent<P>().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const components = new Map<CanonicalId, CanonicalComponent<any>>();

export function registerComponent<P>(def: CanonicalComponent<P>): void {
  if (components.has(def.id)) {
    throw new Error(`duplicate canonical id: ${def.id}`);
  }
  components.set(def.id, def);
}

export function getComponent<P = Record<string, unknown>>(
  id: CanonicalId,
): CanonicalComponent<P> | undefined {
  return components.get(id) as CanonicalComponent<P> | undefined;
}

// Inspector panels know nodes by their Craft `displayName` (which equals each
// canonical's displayName by construction — see craft/resolver.tsx). This
// helper closes the loop so panels can map back to the canonical def.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getComponentByDisplayName(
  displayName: string,
): CanonicalComponent<any> | undefined {
  for (const c of components.values()) {
    if (c.displayName === displayName) return c;
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function listComponents(): CanonicalComponent<any>[] {
  return [...components.values()];
}

// Resolves which inspector panels apply to a canonical. Honors an explicit
// `applicablePanels` field on the canonical if present; otherwise derives a
// sensible default from category + isCanvas.
//
// Defaults:
// - Every canonical gets spacing, size, appearance, effects, componentProps.
// - Containers (isCanvas) additionally get layout.
// - Content/layout categories additionally get typography. Input-category
//   canonicals omit it because their library primitives (shadcn/MUI buttons,
//   inputs) override text-* utilities via cva/internal styling.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getApplicablePanels(c: CanonicalComponent<any>): PanelId[] {
  if (c.applicablePanels) return [...c.applicablePanels];
  const panels: PanelId[] = [
    "spacing",
    "size",
    "appearance",
    "effects",
    "componentProps",
  ];
  if (c.isCanvas) panels.push("layout");
  if (c.category === "content" || c.category === "layout") {
    panels.push("typography");
  }
  return panels;
}
