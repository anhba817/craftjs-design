import { useEditor } from '@craftjs/core'
import { useRef } from 'react'
import { useEditorStore } from '@/state/editorStore'
import { useDocumentStore } from '@/persistence/documentStore'
import { downloadDocument } from '@/persistence/exportDocument'
import { ImportError, importDocumentFromFile } from '@/persistence/importDocument'
import type { EditorDocument } from '@/persistence/schema'
import { AdapterSwitcher } from './AdapterSwitcher'
import { ColorModeToggle } from './ColorModeToggle'
import { DocumentMenu } from './documents/DocumentMenu'
import { ShareButton } from './ShareButton'
import { ThemeSwitcher } from './ThemeSwitcher'
import { ThemeEditorButton } from './theme/ThemeEditorButton'
import { UndoRedo } from './UndoRedo'

export function SaveLoadBar() {
  const { actions, query } = useEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentEnvelope = (): EditorDocument => {
    const { activeThemeId, activeAdapterId, colorMode } =
      useEditorStore.getState()
    return {
      version: 1,
      adapterId: activeAdapterId,
      themeId: activeThemeId,
      colorMode,
      craftJson: query.serialize(),
    }
  }

  const applyEnvelope = (doc: EditorDocument) => {
    actions.deserialize(doc.craftJson)
    const store = useEditorStore.getState()
    if (doc.themeId) store.setActiveTheme(doc.themeId)
    if (doc.colorMode) store.setColorMode(doc.colorMode)
    store.setActiveAdapter(doc.adapterId)
  }

  const handleSave = () => {
    useDocumentStore.getState().saveActiveDocument(currentEnvelope())
  }

  const handleLoad = () => {
    const doc = useDocumentStore.getState().loadActiveDocument()
    if (!doc) return
    applyEnvelope(doc)
  }

  const handleExport = () => {
    // Use the active document's name (or fall back to a timestamp) so
    // re-exports don't collide in the user's downloads folder.
    const { documents, activeId } = useDocumentStore.getState()
    const summary = activeId ? documents.find((d) => d.id === activeId) : null
    const name =
      summary?.name ??
      `craftjs-design-${new Date().toISOString().replace(/[:.]/g, '-')}`
    downloadDocument(currentEnvelope(), name)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset the input so the same file can be imported again — without this
    // the change event won't fire on a second selection of the same file.
    e.target.value = ''
    if (!file) return
    try {
      const doc = await importDocumentFromFile(file)
      applyEnvelope(doc)
      // Persist as the active document so a reload restores the imported
      // content. Group E adds an "Import as new document" affordance that
      // creates a new entry rather than overwriting the active one.
      useDocumentStore.getState().saveActiveDocument(doc)
    } catch (err) {
      const message =
        err instanceof ImportError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Import failed.'
      // Group E (document settings UI) replaces this with a proper toast.
      // For now, alert() keeps the failure mode obvious.
      window.alert(`Import failed: ${message}`)
      console.error('[SaveLoadBar] import:', err)
    }
  }

  return (
    <header
      data-onboarding-target="savebar"
      className="flex items-center gap-2 border-b border-gray-200 px-3 py-2"
    >
      {/* WCAG SC 2.4.6 / axe `page-has-heading-one` — screen readers
          expect an h1 per page. Lives inside the banner landmark so
          axe `region` (all content in landmarks) also passes. The
          editor chrome is visually self-evident; the heading is
          sr-only. */}
      <h1 className="sr-only">Editor</h1>
      <DocumentMenu />
      <UndoRedo />
      <div className="flex-1" />
      <AdapterSwitcher />
      <ThemeSwitcher />
      <ThemeEditorButton />
      <ColorModeToggle />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />
      <ShareButton />
      <button
        type="button"
        onClick={handleImportClick}
        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
      >
        Import
      </button>
      <button
        type="button"
        onClick={handleExport}
        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
      >
        Export
      </button>
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
    </header>
  )
}
