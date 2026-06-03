import { useMemo, useSyncExternalStore } from 'react'
import {
  getAdapterRegistryVersion,
  listAdapters,
  subscribeAdapterRegistry,
} from '@/adapters/AdapterContext'
import { useEditorStore } from '@/state/editorStore'

export function AdapterSwitcher() {
  const activeAdapterId = useEditorStore((s) => s.activeAdapterId)
  const setActiveAdapter = useEditorStore((s) => s.setActiveAdapter)
  // Phase 10 § 2.8 — subscribe to adapter-registry version bumps so
  // post-mount registerAdapter() calls update this dropdown.
  const version = useSyncExternalStore(
    subscribeAdapterRegistry,
    getAdapterRegistryVersion,
    getAdapterRegistryVersion,
  )
  const adapters = useMemo(() => listAdapters(), [version])

  return (
    <label className="flex items-center gap-1.5 text-xs text-ed-text-muted">
      <span className="font-semibold tracking-wide uppercase text-ed-text-muted">Adapter</span>
      <select
        value={activeAdapterId}
        onChange={(e) => setActiveAdapter(e.target.value)}
        className="rounded border border-ed-border-2 bg-ed-surface px-1.5 py-1 text-sm text-ed-text hover:bg-ed-surface-2"
      >
        {adapters.map((a) => (
          <option key={a.id} value={a.id}>
            {a.displayName}
          </option>
        ))}
      </select>
    </label>
  )
}
