import type { CanonicalComponent, CanonicalId, PanelId } from "./types";

// `any` is intentional: the registry stores heterogeneous components keyed by id.
// Public reads narrow back to the caller's generic via getComponent<P>().
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const components = new Map<CanonicalId, CanonicalComponent<any>>();

// Phase 6 → Phase 7 — post-mount registration tracking.
//
// Phase 6 logged a warning when registerCanonical fired post-mount, because
// Craft's resolver was captured at mount time and new canonicals wouldn't
// appear without a reload. Phase 7 swaps the warning for a version counter:
// editor subscribers (Toolbox, the ResolverUpdater inside <Craft>) watch the
// version and re-resolve when it bumps, so registrations land in the live
// editor without a reload.
let editorMounted = false;
let registryVersion = 0;
const registryListeners = new Set<() => void>();

/** @internal Editor.tsx calls this from useEffect on mount. */
export function _markEditorMounted(): void {
  editorMounted = true;
}

/** @internal Test-only — resets the flag between cases. */
export function __setEditorMountedForTest(v: boolean): void {
  editorMounted = v;
}

/**
 * Monotonically-increasing counter incremented on every registry mutation
 * (register OR unregister) that happens AFTER editor mount. Consumed via
 * useSyncExternalStore inside the Editor to drive hot canonical reload.
 */
export function getRegistryVersion(): number {
  return registryVersion;
}

/** Subscribe to registry-version bumps. Returns an unsubscribe function. */
export function subscribeRegistry(cb: () => void): () => void {
  registryListeners.add(cb);
  return () => {
    registryListeners.delete(cb);
  };
}

function bumpVersion(): void {
  registryVersion += 1;
  for (const cb of registryListeners) cb();
}

/**
 * Register a canonical component definition. Adds it to the in-memory
 * registry keyed by `def.id`; subsequent `getComponent(id)` calls return
 * the definition, and post-mount registrations trigger a registry-version
 * bump so the Toolbox + Craft resolver pick them up without a reload.
 *
 * Throws if `def.id` is already registered. Use `unregisterCanonical(id)`
 * first to replace a built-in.
 *
 * @typeParam P - The canonical's props shape (inferred from `def.propsSchema`).
 * @param def - The canonical definition: id, category, displayName, tags,
 *   isCanvas, styleSlots, propsSchema, defaults, plus optional
 *   applicablePanels / canvasSlots overrides.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { registerComponent } from '@crafted-design/editor/sdk'
 *
 * registerComponent({
 *   id: 'stepper',
 *   category: 'navigation',
 *   displayName: 'Stepper',
 *   tags: ['progress', 'wizard'],
 *   isCanvas: false,
 *   styleSlots: ['root'],
 *   propsSchema: z.object({ step: z.number() }),
 *   defaults: { props: { step: 0 }, style: { classes: { root: '' } } },
 * })
 * ```
 */
export function registerComponent<P>(def: CanonicalComponent<P>): void {
  if (components.has(def.id)) {
    throw new Error(`duplicate canonical id: ${def.id}`);
  }
  components.set(def.id, def);
  // Only bump after mount — pre-mount registrations are part of the initial
  // resolver build, so notifying subscribers (none yet) would be wasted work.
  if (editorMounted) bumpVersion();
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
  const had = components.delete(id);
  if (had && editorMounted) bumpVersion();
  return had;
}

/**
 * Look up a canonical by id. Returns `undefined` when the id isn't
 * registered. Cast via the `P` generic when you need the typed props
 * shape; defaults to `Record<string, unknown>` if omitted.
 */
export function getComponent<P = Record<string, unknown>>(
  id: CanonicalId,
): CanonicalComponent<P> | undefined {
  return components.get(id) as CanonicalComponent<P> | undefined;
}

/**
 * Reverse-lookup helper. Inspector panels and Craft.js know nodes by
 * their `displayName` (each canonical's displayName is also its Craft
 * user-component name — see `src/craft/resolver.tsx`). This is the
 * one path back to the canonical def.
 */
export function getComponentByDisplayName(
  displayName: string,
  // The registry stores canonicals of mixed prop generics; `any` is the
  // pragmatic erasure for the cross-generic lookup (callers narrow via the
  // returned def's own schema). Scoped disable on the type line itself.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): CanonicalComponent<any> | undefined {
  for (const c of components.values()) {
    if (c.displayName === displayName) return c;
  }
  return undefined;
}

/** All registered canonicals, in registration order. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function listComponents(): CanonicalComponent<any>[] {
  return [...components.values()];
}

/**
 * Resolve the canvas-slot list for a canonical. When `canvasSlots` is
 * declared explicitly, it wins (multi-canvas Pattern B). Function form
 * (Phase 7) is called with the current node's props for dynamic counts
 * (e.g., Tabs: one slot per tab). Otherwise the legacy rule holds:
 * `isCanvas=true` → `['root']` (Pattern A single canvas), false → `[]`.
 *
 * @param c - The canonical definition.
 * @param nodeProps - Current node props, used only when `canvasSlots` is
 *   a function. Optional for the static cases.
 * @returns The slot keys for this canonical instance.
 */
export function getCanvasSlots(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: CanonicalComponent<any>,
  nodeProps?: Record<string, unknown>,
): readonly string[] {
  if (typeof c.canvasSlots === "function") {
    return c.canvasSlots(nodeProps ?? {});
  }
  if (c.canvasSlots !== undefined) return c.canvasSlots;
  return c.isCanvas ? ["root"] : [];
}

/**
 * Resolve which inspector panels apply to a canonical. Honours an
 * explicit `applicablePanels` field on the canonical if present;
 * otherwise derives a sensible default from `category` + `isCanvas`:
 *
 *   - Every canonical gets `spacing`, `size`, `appearance`, `effects`,
 *     `componentProps`.
 *   - Containers (`isCanvas`) additionally get `layout`.
 *   - Content / layout categories additionally get `typography`. The
 *     `input` category omits typography because library primitives
 *     (shadcn / MUI inputs) override text-* utilities internally.
 */
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
