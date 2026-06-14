import { useEditor } from '@craftjs/core'
import { PanelLeft, PanelRight } from 'lucide-react'
import { useRef } from 'react'
import { useEditorStore } from '@/state/editorStore'
import { useEditorViewport } from './responsive/useEditorViewport'
import { useDocumentStore } from '@/persistence/documentStore'
import { downloadDocument } from '@/persistence/exportDocument'
import { ImportError, importDocumentFromFile } from '@/persistence/importDocument'
import { applyEnvelope, buildEnvelope } from './document/envelope'
import { AdapterSwitcher } from './AdapterSwitcher'
import { ColorModeToggle } from './ColorModeToggle'
import { PreviewToggle } from './PreviewToggle'
import { DocumentMenu } from './documents/DocumentMenu'
import { ShareButton } from './ShareButton'
import { ThemeSwitcher } from './ThemeSwitcher'
import { ThemeEditorButton } from './theme/ThemeEditorButton'
import { UndoRedo } from './UndoRedo'

export function SaveLoadBar() {
  const { actions, query } = useEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Phase 18 follow-up — the host decides whether end users may switch
  // adapters (<Editor allowUserToSwitchAdapter />). Hidden when pinned.
  const allowAdapterSwitch = useEditorStore((s) => s.allowAdapterSwitch)

  // Phase 25 — below lg the side panels are overlay drawers; these toggles
  // open them. Hidden at/above lg, where the panels are docked columns.
  const { isDesktop } = useEditorViewport()
  const setLeftPanelOpen = useEditorStore((s) => s.setLeftPanelOpen)
  const setRightPanelOpen = useEditorStore((s) => s.setRightPanelOpen)

  // Phase 23 § Decision 3 — both delegate to the shared envelope module so
  // Save / Load / Import emit the exact same shape as onChange + the ref.
  const currentEnvelope = () => buildEnvelope(query)

  const handleSave = () => {
    useDocumentStore.getState().saveActiveDocument(currentEnvelope())
  }

  const handleLoad = () => {
    void useDocumentStore
      .getState()
      .loadActiveDocument()
      .then((doc) => {
        if (doc) applyEnvelope(actions, doc)
      })
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
      applyEnvelope(actions, doc)
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
      className="flex items-center gap-2 border-b border-ed-border px-3 py-2"
    >
      {/* WCAG SC 2.4.6 / axe `page-has-heading-one` — screen readers
          expect an h1 per page. Lives inside the banner landmark so
          axe `region` (all content in landmarks) also passes. The
          editor chrome is visually self-evident; the heading is
          sr-only. */}
      <h1 className="sr-only">Editor</h1>
      {/* Phase 25 — open the left (Components/Layers) drawer; only below lg. */}
      {!isDesktop && (
        <button
          type="button"
          aria-label="Open components and layers"
          onClick={() => setLeftPanelOpen(true)}
          className="rounded border border-ed-border-2 p-1.5 text-ed-text hover:bg-ed-surface-2"
        >
          <PanelLeft size={16} aria-hidden />
        </button>
      )}
      <DocumentMenu />
      <UndoRedo />
      <div className="flex-1" />
      <PreviewToggle />
      {allowAdapterSwitch && <AdapterSwitcher />}
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
        className="rounded border border-ed-border-2 px-2 py-1 text-sm text-ed-text hover:bg-ed-surface-2"
      >
        Import
      </button>
      <button
        type="button"
        onClick={handleExport}
        className="rounded border border-ed-border-2 px-2 py-1 text-sm text-ed-text hover:bg-ed-surface-2"
      >
        Export
      </button>
      <button
        type="button"
        onClick={handleSave}
        className="rounded border border-ed-border-2 px-2 py-1 text-sm text-ed-text hover:bg-ed-surface-2"
      >
        Save
      </button>
      <button
        type="button"
        onClick={handleLoad}
        className="rounded border border-ed-border-2 px-2 py-1 text-sm text-ed-text hover:bg-ed-surface-2"
      >
        Load
      </button>
      {/* Phase 25 — open the right (Properties/Overlays) drawer; only below lg. */}
      {!isDesktop && (
        <button
          type="button"
          aria-label="Open inspector"
          onClick={() => setRightPanelOpen(true)}
          className="rounded border border-ed-border-2 p-1.5 text-ed-text hover:bg-ed-surface-2"
        >
          <PanelRight size={16} aria-hidden />
        </button>
      )}
    </header>
  )
}
