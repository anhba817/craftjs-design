import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'
import {
  getFontRegistryVersion,
  listFontTokens,
  registerFontToken,
  subscribeFontRegistry,
  unregisterFontToken,
} from '@/registry/fonts'
import { useEditorImageProvider } from '../assets/EditorImageProvider'

// Phase 12 § 4.15 — font upload. Drop / pick a font file → name it →
// registerFontToken with the uploaded URL (the registry injects the
// @font-face). Storage routes through the same asset provider as images:
// the default inlines a data URL; a host provider uploads to a backend.
// The new font appears in the Typography panel's Font dropdown immediately
// (it subscribes to the registry version).

const FONT_ACCEPT = '.woff2,.woff,.ttf,.otf'
const FALLBACK_FAMILY = 'sans-serif'

// Font-token ids must match /^[a-z0-9-]+$/ (see registry/fonts.ts).
function slugFontId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function nameFromFile(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Custom font'
}

export function FontUploadPanel() {
  const provider = useEditorImageProvider()
  const version = useSyncExternalStore(
    subscribeFontRegistry,
    getFontRegistryVersion,
    getFontRegistryVersion,
  )
  // Only url-backed tokens are uploads — the built-ins (sans/heading/mono)
  // carry no url and aren't removable here.
  const uploaded = useMemo(() => listFontTokens().filter((t) => t.url), [version])

  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ url: string; name: string } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const asset = await provider.upload(file)
      setPending({ url: asset.url, name: nameFromFile(file.name) })
    } catch {
      setError('Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const add = () => {
    if (!pending) return
    const id = slugFontId(pending.name)
    if (!id) {
      setError('Enter a valid name (letters / numbers).')
      return
    }
    registerFontToken({
      id,
      name: pending.name,
      family: FALLBACK_FAMILY,
      url: pending.url,
    })
    setPending(null)
  }

  const pendingId = pending ? slugFontId(pending.name) : ''

  return (
    <section className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          void handleFile(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'rounded border border-dashed px-3 py-4 text-center text-xs',
          dragOver ? 'border-primary bg-primary/5' : 'border-gray-300',
        )}
      >
        <p className="text-gray-500">Drop a font file here, or</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="mt-1 rounded border border-gray-300 bg-white px-2 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Choose .woff2 / .ttf / .otf'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={FONT_ACCEPT}
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      {pending && (
        <div className="space-y-1.5 rounded border border-gray-200 p-2">
          <div className="text-[11px] text-gray-500">Name this font</div>
          <input
            type="text"
            value={pending.name}
            onChange={(e) =>
              setPending((p) => (p ? { ...p, name: e.target.value } : p))
            }
            className="w-full rounded border border-gray-300 px-1.5 py-1 text-sm text-gray-700"
          />
          <div className="text-[10px] text-gray-400">
            class <code>font-{pendingId || '…'}</code>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              disabled={!pendingId}
              className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              Add font
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <div className="text-[11px] text-red-600">{error}</div>}

      {uploaded.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-gray-500">
            Uploaded fonts
          </div>
          {uploaded.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded border border-gray-200 px-2 py-1"
            >
              <span
                className="truncate text-sm text-gray-700"
                style={{ fontFamily: `"${t.id}", ${FALLBACK_FAMILY}` }}
              >
                {t.name}
              </span>
              <button
                type="button"
                onClick={() => unregisterFontToken(t.id)}
                className="shrink-0 text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400">
        Uploaded fonts appear in the Typography → Font dropdown.
      </p>
    </section>
  )
}
