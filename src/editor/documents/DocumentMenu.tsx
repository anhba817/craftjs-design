import {
  ChevronDown,
  Copy,
  FilePlus,
  HelpCircle,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useDocumentStore } from '@/persistence/documentStore'
import { reopenOnboardingTour } from '../discoverability/OnboardingTour'
import { TemplatePicker } from './TemplatePicker'
import { useDocumentSwitcher } from './useDocumentSwitcher'
import { VersionHistory } from './VersionHistory'

// Top-bar dropdown. Trigger button shows the active doc name + chevron;
// dropdown content has the management surface (new, switch, rename, dup, del).
//
// Rename mode is in-place: clicking "Rename" replaces the active doc name in
// the dropdown with an editable input. Blur or Enter commits; Escape cancels.
export function DocumentMenu() {
  const documents = useDocumentStore((s) => s.documents)
  const activeId = useDocumentStore((s) => s.activeId)
  const renameDocument = useDocumentStore((s) => s.renameDocument)
  const duplicateDocument = useDocumentStore((s) => s.duplicateDocument)
  const deleteDocument = useDocumentStore((s) => s.deleteDocument)

  const { switchTo, createBlank, createFromTemplate } = useDocumentSwitcher()

  const activeSummary = activeId
    ? documents.find((d) => d.id === activeId)
    : null

  const [renaming, setRenaming] = useState(false)
  const [renameInput, setRenameInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  // Bail out of rename mode if the user switches docs while editing.
  useEffect(() => {
    setRenaming(false)
  }, [activeId])

  const commitRename = () => {
    if (renaming && activeId && renameInput.trim()) {
      renameDocument(activeId, renameInput.trim())
    }
    setRenaming(false)
  }

  // Generate a sensible default name for "New blank document" based on the
  // current count — designers don't have to think about naming until they
  // care to.
  const nextUntitledName = () => {
    const existing = documents.map((d) => d.name)
    let i = 1
    while (existing.includes(`Untitled ${i}`)) i += 1
    return existing.includes('Untitled') && i === 1 ? 'Untitled 2' : `Untitled ${i}`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-gray-100"
        >
          <span className="font-medium text-gray-800">
            {activeSummary?.name ?? 'Untitled'}
          </span>
          <ChevronDown size={14} className="text-gray-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="start">
        {/* Active doc row — name editable in place. */}
        <div className="px-2 py-1.5">
          {renaming && activeId ? (
            <input
              ref={inputRef}
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                else if (e.key === 'Escape') setRenaming(false)
              }}
              className="w-full rounded border border-gray-300 px-1.5 py-0.5 text-sm text-gray-800"
            />
          ) : (
            <DropdownMenuLabel className="px-0 text-xs uppercase tracking-wide text-gray-400">
              Active document
            </DropdownMenuLabel>
          )}
        </div>

        {activeSummary && !renaming && (
          <div className="flex items-center gap-1 px-2 pb-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                setRenameInput(activeSummary.name)
                setRenaming(true)
              }}
              className="flex flex-1 items-center gap-1.5 rounded px-1.5 py-1 text-xs text-gray-600 hover:bg-muted"
            >
              <Pencil size={11} /> Rename
            </button>
            <button
              type="button"
              onClick={() => {
                void duplicateDocument(activeSummary.id).then((newId) =>
                  switchTo(newId),
                )
              }}
              className="flex flex-1 items-center gap-1.5 rounded px-1.5 py-1 text-xs text-gray-600 hover:bg-muted"
            >
              <Copy size={11} /> Duplicate
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  documents.length > 0 &&
                  !window.confirm(
                    `Delete "${activeSummary.name}"? This can't be undone.`,
                  )
                ) {
                  return
                }
                deleteDocument(activeSummary.id)
              }}
              className="flex flex-1 items-center gap-1.5 rounded px-1.5 py-1 text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => {
            createBlank(nextUntitledName())
          }}
        >
          <FilePlus size={14} className="text-gray-500" />
          New blank document
        </DropdownMenuItem>

        {/* TemplatePicker is its own popover trigger — preventDefault keeps the
            outer dropdown open while the user picks a template. */}
        <div onPointerDown={(e) => e.stopPropagation()}>
          <TemplatePicker
            onPick={(templateId) => {
              createFromTemplate(templateId, nextUntitledName())
            }}
          />
        </div>

        <DropdownMenuSeparator />

        {/* Phase 11 § 3.8 — replay the first-load tour. Clears the
            localStorage flag and re-fires the show-onboarding
            event so OnboardingTour reopens at step 1. */}
        <DropdownMenuItem onSelect={() => reopenOnboardingTour()}>
          <HelpCircle size={14} className="text-gray-500" />
          Show tour again
        </DropdownMenuItem>

        {documents.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs uppercase tracking-wide text-gray-400">
              Switch to
            </DropdownMenuLabel>
            <div className="max-h-48 overflow-y-auto">
              {documents
                .filter((d) => d.id !== activeId)
                .map((d) => (
                  <DropdownMenuItem
                    key={d.id}
                    onSelect={() => switchTo(d.id)}
                    className={cn('flex flex-col items-start gap-0')}
                  >
                    <span className="text-sm text-gray-800">{d.name}</span>
                    <span className="text-[10px] text-gray-400">
                      updated {new Date(d.updated).toLocaleDateString()}
                    </span>
                  </DropdownMenuItem>
                ))}
            </div>
          </>
        )}

        {/* Phase 14 § 6.3 — version history (hidden when the active
            adapter doesn't support snapshots). */}
        <VersionHistory activeId={activeId} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
