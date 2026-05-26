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
    <label className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className="font-semibold tracking-wide uppercase text-gray-500">Adapter</span>
      <select
        value={activeAdapterId}
        onChange={(e) => setActiveAdapter(e.target.value)}
        className="rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-700 hover:bg-gray-50"
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
