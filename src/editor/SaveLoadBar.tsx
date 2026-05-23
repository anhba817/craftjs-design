import { useEditor } from '@craftjs/core'
import { useEditorStore } from '@/state/editorStore'
import { loadDocument, saveDocument } from '@/persistence/storage'
import { AdapterSwitcher } from './AdapterSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'

export function SaveLoadBar() {
  const { actions, query } = useEditor()

  const handleSave = () => {
    // getState() avoids re-rendering this component when the store changes —
    // we only need the latest values at click time.
    const { activeThemeId, activeAdapterId } = useEditorStore.getState()
    saveDocument({
      version: 1,
      adapterId: activeAdapterId,
      themeId: activeThemeId,
      craftJson: query.serialize(),
    })
  }

  const handleLoad = () => {
    const doc = loadDocument()
    if (!doc) return
    actions.deserialize(doc.craftJson)
    const store = useEditorStore.getState()
    if (doc.themeId) store.setActiveTheme(doc.themeId)
    store.setActiveAdapter(doc.adapterId)
  }

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
      <span className="text-xs font-semibold tracking-wide uppercase text-gray-500">
        craftjs-design
      </span>
      <div className="flex-1" />
      <AdapterSwitcher />
      <ThemeSwitcher />
      <button
        type="button"
        onClick={handleSave}
        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
      >
        Save
      </button>
      <button
        type="button"
        onClick={handleLoad}
        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
      >
        Load
      </button>
    </div>
  )
}
