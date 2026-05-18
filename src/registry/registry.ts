import type { CanonicalComponent, CanonicalId } from "./types";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function listComponents(): CanonicalComponent<any>[] {
  return [...components.values()];
}
