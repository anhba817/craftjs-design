import { useEditor } from '@craftjs/core'
import { Check, Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SHARE_URL_MAX_PAYLOAD, shareUrlFor } from '@/persistence/share'
import {
  CURRENT_DOCUMENT_VERSION,
  type EditorDocument,
} from '@/persistence/schema'
import { useEditorStore } from '@/state/editorStore'

// Share button + popover. The popover content unmounts when closed (Radix
// default), so the encoded URL is freshly computed each open — reflects the
// current document state, not whatever was serialized on first render.
export function ShareButton() {
  const { query } = useEditor()
  const [open, setOpen] = useState(false)

  const buildEnvelope = (): EditorDocument => {
    const { activeThemeId, activeAdapterId } = useEditorStore.getState()
    return {
      version: CURRENT_DOCUMENT_VERSION,
      adapterId: activeAdapterId,
      themeId: activeThemeId,
      craftJson: query.serialize(),
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded border border-ed-border-2 px-2 py-1 text-sm text-ed-text hover:bg-ed-surface-2"
        >
          Share
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2 p-3" align="end">
        {open && <ShareContent buildEnvelope={buildEnvelope} />}
      </PopoverContent>
    </Popover>
  )
}

function ShareContent({ buildEnvelope }: { buildEnvelope: () => EditorDocument }) {
  // Compute once on open; the user closes/reopens if they need a refresh.
  const result = useMemo(() => {
    const baseUrl = window.location.origin + window.location.pathname
    return shareUrlFor(buildEnvelope(), baseUrl)
  }, [buildEnvelope])

  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error('[ShareButton] clipboard write failed:', err)
      // Fall back to a manual select. The text is already in the read-only
      // input below — the user can copy via Ctrl/Cmd+C.
    }
  }

  if (result.exceedsLimit) {
    const jsonForClipboard = () =>
      copyToClipboard(JSON.stringify(buildEnvelope(), null, 2))
    return (
      <div className="space-y-2">
        <p className="text-xs text-ed-text">
          This document is too large to share via URL (
          {result.byteLength.toLocaleString()} of {SHARE_URL_MAX_PAYLOAD.toLocaleString()} chars).
        </p>
        <p className="text-xs text-ed-text-muted">
          Copy as JSON instead — paste into another editor's Import.
        </p>
        <button
          type="button"
          onClick={jsonForClipboard}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-ed-border-2 bg-ed-surface px-2 py-1.5 text-sm text-ed-text hover:bg-ed-surface-2"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy as JSON'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-ed-text">
        Anyone who opens this URL gets a copy of the current document.
      </p>
      <input
        type="text"
        readOnly
        value={result.url}
        onFocus={(e) => e.currentTarget.select()}
        onClick={(e) => e.currentTarget.select()}
        className="w-full rounded border border-ed-border-2 bg-ed-surface px-1.5 py-1 text-xs text-ed-text"
      />
      <button
        type="button"
        onClick={() => copyToClipboard(result.url)}
        className="flex w-full items-center justify-center gap-1.5 rounded border border-ed-border-2 bg-ed-surface px-2 py-1.5 text-sm text-ed-text hover:bg-ed-surface-2"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <p className="text-[10px] text-ed-text-faint">
        The document is encoded in the URL fragment — it isn't private. Anyone
        with the link (or browser history) can read it.
      </p>
    </div>
  )
}
