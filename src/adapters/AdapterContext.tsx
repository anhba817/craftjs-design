import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useEditorStore } from "@/state/editorStore";
import { adapterManifestSchema } from "./AdapterManifestSchema";
import type { Adapter } from "./types";

const adapters = new Map<string, Adapter>();

// Phase 10 § 2.8 — hot-reload subscription. Same pattern as the
// font-token registry (src/registry/fonts.ts). Version increments on
// every register / unregister; AdapterSwitcher subscribes via
// useSyncExternalStore so post-mount registerAdapter() calls update
// the dropdown without a remount.
let adapterRegistryVersion = 0;
const adapterRegistryListeners = new Set<() => void>();

/**
 * Monotonically-increasing counter incremented on every adapter
 * registry mutation. Consumed via `useSyncExternalStore` by the
 * AdapterSwitcher so post-mount registrations surface immediately.
 */
export function getAdapterRegistryVersion(): number {
  return adapterRegistryVersion;
}

/** Subscribe to adapter-registry version bumps. Returns an unsubscribe function. */
export function subscribeAdapterRegistry(cb: () => void): () => void {
  adapterRegistryListeners.add(cb);
  return () => {
    adapterRegistryListeners.delete(cb);
  };
}

function bumpAdapterRegistry(): void {
  adapterRegistryVersion += 1;
  for (const cb of adapterRegistryListeners) cb();
}

/**
 * Remove an adapter by id. Returns `true` if an adapter was removed.
 * Hosts that want to replace a built-in adapter call this then
 * `registerAdapter(replacement)` with the same id.
 */
export function unregisterAdapter(id: string): boolean {
  const had = adapters.delete(id);
  if (had) bumpAdapterRegistry();
  return had;
}

/**
 * Register an adapter — a UI library binding that provides renderers for
 * each canonical id. Validates the manifest structurally (Zod) before
 * mutating registry state; throws with a readable message on either a
 * schema violation or a duplicate id.
 *
 * Adapters should register at module load so they're available before
 * `<Editor />` mounts. Post-mount registration works but the
 * AdapterSwitcher's dropdown captures the list at open time — see
 * Phase 10 § 2.8 for the hot-reload variant.
 *
 * @param adapter - The adapter manifest: `{ id, displayName, components,
 *   classMap?, Wrapper?, mount?, unmount? }`.
 *
 * @example
 * ```ts
 * import { registerAdapter } from '@crafted-design/editor/sdk'
 * import type { AdapterRenderProps } from '@crafted-design/editor/sdk'
 *
 * function MyButton({ props, rootRef, className }: AdapterRenderProps) {
 *   const { label } = props as { label: string }
 *   return <button ref={rootRef as never} className={className}>{label}</button>
 * }
 *
 * registerAdapter({
 *   id: 'mylib',
 *   displayName: 'My Library',
 *   components: { button: MyButton },
 * })
 * ```
 */
export function registerAdapter(adapter: Adapter): void {
  // Validate structural shape before mutating registry state. Failing here
  // gives plugin authors a readable boot-time error instead of a confusing
  // render-time crash later.
  const result = adapterManifestSchema.safeParse(adapter);
  if (!result.success) {
    const id = (adapter as { id?: unknown }).id ?? "<no id>";
    throw new Error(
      `invalid adapter manifest for '${String(id)}': ${result.error.message}`,
    );
  }
  if (adapters.has(adapter.id)) {
    throw new Error(`duplicate adapter id: ${adapter.id}`);
  }
  adapters.set(adapter.id, adapter);
  bumpAdapterRegistry();
}

/** Look up an adapter by id. Returns `undefined` if not registered. */
export function getAdapter(id: string): Adapter | undefined {
  return adapters.get(id);
}

/** All registered adapters, in registration order. */
export function listAdapters(): Adapter[] {
  return [...adapters.values()];
}

const AdapterCtx = createContext<Adapter | null>(null);

// Provider subscribes to activeAdapterId from the editor store, fires
// mount/unmount hooks when the adapter changes, and renders ALL adapters'
// Wrappers around children (not just the active one).
//
// Why "all" instead of just the active one: conditionally rendering Wrapper
// based on adapter changes the React tree shape on swap, which unmounts the
// entire children subtree — including <Frame>. Craft.js's <Frame> re-seeds
// its initial children on mount, so the user's canvas content gets wiped to
// the empty root Box on every adapter swap.
//
// Composing all Wrappers keeps the tree shape STABLE. Inactive adapters'
// Wrappers (e.g., MUI's ThemeProvider when shadcn is active) just provide
// React context that no component reads — no observable effect, no cost
// beyond a few extra context providers in the tree. As long as Wrappers are
// idempotent context providers (which they should be), this composition is
// safe regardless of which adapter is active.
//
// Future adapters with side-effecting Wrappers (global CSS reset, document-
// level event listeners) would need a different strategy — Phase 6's plugin
// SDK can address that by adding a `globalSideEffects` flag to the manifest.
export function AdapterProvider({ children }: { children: ReactNode }) {
  const adapterId = useEditorStore((s) => s.activeAdapterId);
  const adapter = getAdapter(adapterId) ?? getAdapter("shadcn");
  if (!adapter) {
    throw new Error(
      "no adapter registered — App.tsx must side-effect-import at least one adapter before <Editor /> mounts",
    );
  }

  // Mount/unmount pairing for the *active* adapter. When activeAdapter changes,
  // React fires the PREVIOUS effect's cleanup (unmount on the OLD adapter,
  // captured in the closure) before running the NEW effect. The Wrapper
  // composition is separate from this — Wrappers stay mounted; only the
  // imperative mount/unmount hooks fire on swap.
  useEffect(() => {
    try {
      adapter.mount?.();
    } catch (err) {
      console.error(`[Adapter:${adapter.id}] mount failed:`, err);
    }
    return () => {
      try {
        adapter.unmount?.();
      } catch (err) {
        console.error(`[Adapter:${adapter.id}] unmount failed:`, err);
      }
    };
  }, [adapter]);

  return (
    <AdapterCtx.Provider value={adapter}>
      {composeAllWrappers(listAdapters(), children)}
    </AdapterCtx.Provider>
  );
}

function composeAllWrappers(all: Adapter[], children: ReactNode): ReactNode {
  // Fold Wrappers from outside in. Order is the registration order from
  // listAdapters(), which is stable across renders (adapters register at
  // module load and never change at runtime), so React's reconciler keeps
  // every Wrapper mounted across adapter swaps.
  let wrapped = children;
  for (const adapter of all) {
    if (adapter.Wrapper) {
      const W = adapter.Wrapper;
      wrapped = <W key={adapter.id}>{wrapped}</W>;
    }
  }
  return wrapped;
}

/**
 * Hook returning the currently-active adapter. The active adapter changes
 * when the user picks a different one in the AdapterSwitcher (or when a
 * loaded document sets `adapterId` on its envelope). Reads from
 * `<AdapterProvider>`; throws if called outside the editor's React tree.
 *
 * Adapter authors don't typically need this — adapters' own components
 * receive props via `AdapterRenderProps`. SDK consumers writing custom
 * panels can use it to read the active adapter's `classMap` or metadata.
 */
export function useActiveAdapter(): Adapter {
  const adapter = useContext(AdapterCtx);
  if (!adapter) {
    throw new Error("useActiveAdapter must be used inside <AdapterProvider>");
  }
  return adapter;
}
