import type { CanonicalComponent, CanonicalId, PanelId } from "./types";

// `any` is intentional: the registry stores heterogeneous components keyed by id.
// Public reads narrow back to the caller's generic via getComponent<P>().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const components = new Map<CanonicalId, CanonicalComponent<any>>();

// Phase 6 — post-mount registration tracking. Once the Editor has rendered,
// registering a new canonical is no longer safe without a reload: Craft.js's
// resolver was already built from the registry state at mount time, so new
// canonical ids won't appear in the Toolbox or render correctly. We log a
// warning so SDK consumers see the gap early.
let editorMounted = false;

/** @internal Editor.tsx calls this from useEffect on mount. */
export function _markEditorMounted(): void {
  editorMounted = true;
}

/** @internal Test-only — resets the flag between cases. */
export function __setEditorMountedForTest(v: boolean): void {
  editorMounted = v;
}

export function registerComponent<P>(def: CanonicalComponent<P>): void {
  if (editorMounted) {
    console.warn(
      `[craftjs-design] '${def.id}' registered after editor mount. ` +
        `Reload to pick up the new canonical — hot canonical reload is a Phase 7 item.`,
    );
  }
  if (components.has(def.id)) {
    throw new Error(`duplicate canonical id: ${def.id}`);
  }
  components.set(def.id, def);
}

/**
 * Register a canonical component. Identical to registerComponent — kept under
 * a more readable name for SDK consumers writing custom canonicals.
 *
 * @example
 *   registerCanonical({
 *     id: 'stepper',
 *     category: 'navigation',
 *     displayName: 'Stepper',
 *     tags: ['progress'],
 *     isCanvas: false,
 *     styleSlots: ['root'],
 *     propsSchema: z.object({ step: z.number() }),
 *     defaults: { props: { step: 0 }, style: { classes: { root: '' } } },
 *   })
 */
export const registerCanonical = registerComponent;

/**
 * Remove a canonical from the registry. Used by SDK consumers that want to
 * replace a built-in (call unregisterCanonical first, then registerCanonical
 * with the same id). Returns true if a canonical was removed.
 */
export function unregisterCanonical(id: CanonicalId): boolean {
  return components.delete(id);
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

// Derives the canvas-slot list for a canonical. When canvasSlots is explicit,
// it wins (multi-canvas Pattern B). Otherwise the legacy rule holds:
// isCanvas=true → ['root'] (Pattern A single canvas), false → [].
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCanvasSlots(c: CanonicalComponent<any>): readonly string[] {
  if (c.canvasSlots !== undefined) return c.canvasSlots;
  return c.isCanvas ? ["root"] : [];
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
