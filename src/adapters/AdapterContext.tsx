import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useEditorStore } from "@/state/editorStore";
import { adapterManifestSchema } from "./AdapterManifestSchema";
import type { Adapter } from "./types";

const adapters = new Map<string, Adapter>();

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
}

export function getAdapter(id: string): Adapter | undefined {
  return adapters.get(id);
}

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

export function useActiveAdapter(): Adapter {
  const adapter = useContext(AdapterCtx);
  if (!adapter) {
    throw new Error("useActiveAdapter must be used inside <AdapterProvider>");
  }
  return adapter;
}
