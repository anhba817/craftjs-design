import { History, RotateCcw, Save } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { DocumentVersion } from '@/persistence/types'
import { useVersionHistory } from './useVersionHistory'

// Phase 14 § 6.3 — version history section inside the DocumentMenu.
// Lists snapshots (manual save points labeled, autos timestamped) with a
// Restore action, plus a "Save version…" button. Renders nothing when the
// active adapter doesn't support versioning (e.g. the localStorage
// fallback), so the menu stays clean.
//
// `activeId` is passed so the list refreshes when the user switches docs.
export function VersionHistory({ activeId }: { activeId: string | null }) {
  const { list, saveNamed, restore, supported } = useVersionHistory()
  const [versions, setVersions] = useState<DocumentVersion[]>([])

  const refresh = useCallback(() => {
    if (!supported) return
    void list().then(setVersions)
  }, [list, supported])

  useEffect(() => {
    refresh()
  }, [refresh, activeId])

  if (!supported) return null

  const handleSave = () => {
    const label = window.prompt('Name this version:')
    if (!label?.trim()) return
    void saveNamed(label.trim()).then(refresh)
  }

  const handleRestore = (versionId: string) => {
    void restore(versionId).then(refresh)
  }

  return (
    <>
      <DropdownMenuSeparator />
      <div className="flex items-center justify-between px-2 py-1">
        <DropdownMenuLabel className="flex items-center gap-1.5 px-0 text-xs uppercase tracking-wide text-gray-400">
          <History size={12} /> Versions
        </DropdownMenuLabel>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            handleSave()
          }}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-muted"
        >
          <Save size={11} /> Save version
        </button>
      </div>
      {versions.length === 0 ? (
        <div className="px-2 pb-1.5 text-[11px] text-gray-400">
          No saved versions yet.
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {versions.map((v) => (
            <div
              key={v.versionId}
              className="flex items-center justify-between gap-2 px-2 py-1 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-gray-700">
                  {v.label ?? (v.kind === 'manual' ? 'Save point' : 'Autosave')}
                </div>
                <div className="text-[10px] text-gray-400">
                  {new Date(v.created).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  handleRestore(v.versionId)
                }}
                className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-muted"
              >
                <RotateCcw size={11} /> Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
