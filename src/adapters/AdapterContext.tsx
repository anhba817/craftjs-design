import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Adapter } from "./types";

const adapters = new Map<string, Adapter>();

export function registerAdapter(adapter: Adapter): void {
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

export function AdapterProvider({
  adapterId,
  children,
}: {
  adapterId: string;
  children: ReactNode;
}) {
  const adapter = getAdapter(adapterId);
  if (!adapter) {
    throw new Error(`unknown adapter: ${adapterId}`);
  }
  return <AdapterCtx.Provider value={adapter}>{children}</AdapterCtx.Provider>;
}

export function useActiveAdapter(): Adapter {
  const adapter = useContext(AdapterCtx);
  if (!adapter) {
    throw new Error("useActiveAdapter must be used inside <AdapterProvider>");
  }
  return adapter;
}
