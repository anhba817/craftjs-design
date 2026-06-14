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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the registry-change trigger; listAdapters() reads mutable registry state the linter can't track.
  const adapters = useMemo(() => listAdapters(), [version])

  return (
    <label className="flex items-center gap-1.5 text-xs text-ed-text-muted">
      <span className="shrink-0 font-semibold tracking-wide uppercase text-ed-text-muted">Adapter</span>
      <select
        value={activeAdapterId}
        onChange={(e) => setActiveAdapter(e.target.value)}
        // min-w-0 + flex-1 so the select shrinks to share its row when the label
        // is stretched (e.g. the narrow toolbar overflow popover) instead of
        // overflowing; in the content-sized toolbar it keeps its natural width.
        className="min-w-0 flex-1 rounded border border-ed-border-2 bg-ed-surface px-1.5 py-1 text-sm text-ed-text hover:bg-ed-surface-2"
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
