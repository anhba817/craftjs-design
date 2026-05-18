import { useEditor } from '@craftjs/core'
import { loadDocument, saveDocument } from '../persistence/storage'

export function SaveLoadBar() {
  const { actions, query } = useEditor()

  const handleSave = () => {
    saveDocument({
      version: 1,
      adapterId: 'shadcn',
      craftJson: query.serialize(),
    })
  }

  const handleLoad = () => {
    const doc = loadDocument()
    if (doc) actions.deserialize(doc.craftJson)
  }

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
      <span className="text-xs font-semibold tracking-wide uppercase text-gray-500">
        craftjs-design
      </span>
      <div className="flex-1" />
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
