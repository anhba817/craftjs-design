import { useEditor } from '@craftjs/core'
import { ImageUp, Images } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  useEditorImageProvider,
  type EditorImageAsset,
} from './EditorImageProvider'

// Phase 11 § 3.10 — replaces the plain text input for the Image
// canonical's `src` prop. Affordances:
//   - A URL text field (paste a link directly).
//   - "Upload": file input → provider.upload() → write src.
//   - "Library": opens a MODAL with a grid of available images.
//     When the provider can list (host backend), pulls from
//     provider.list(); otherwise scans the current document's Image
//     nodes so the designer can reuse an on-canvas image.

export function ImagePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const provider = useEditorImageProvider()
  const [uploading, setUploading] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Document-scan fallback for the Library: every distinct Image
  // `src` already used in the document. Subscribe to state.nodes BY
  // REFERENCE so this recomputes when an image is uploaded /
  // changed (the previous version memoized on the stable `query`
  // ref and never updated — newly-uploaded images never appeared).
  const { query, nodes } = useEditor((state) => ({ nodes: state.nodes }))
  const documentImages = useMemo<EditorImageAsset[]>(() => {
    const seen = new Set<string>()
    const out: EditorImageAsset[] = []
    try {
      for (const id of Object.keys(nodes ?? {})) {
        const data = query.node(id).get().data
        if (data.displayName !== 'Image') continue
        const src = (
          data.props as { nodeProps?: { src?: unknown } }
        )?.nodeProps?.src
        if (typeof src === 'string' && src && !seen.has(src)) {
          seen.add(src)
          out.push({ url: src })
        }
      }
    } catch {
      // Hydration race — return what we have.
    }
    return out
  }, [nodes, query])

  // Provider's known images (default provider → session uploads;
  // host provider → backend listing). Loaded when the modal opens.
  const [providerAssets, setProviderAssets] = useState<EditorImageAsset[]>([])
  useEffect(() => {
    if (!libraryOpen) return
    let cancelled = false
    provider
      .list()
      .then((list) => {
        if (!cancelled) setProviderAssets(list)
      })
      .catch(() => {
        if (!cancelled) setProviderAssets([])
      })
    return () => {
      cancelled = true
    }
  }, [libraryOpen, provider])

  // Union the provider's images with the current document's images,
  // deduped by URL. Provider uploads come first (most recently
  // uploaded → most relevant), then any document images not already
  // covered (e.g. URL-pasted srcs or images from a loaded doc).
  const assets = useMemo<EditorImageAsset[]>(() => {
    const seen = new Set<string>()
    const out: EditorImageAsset[] = []
    for (const a of [...providerAssets, ...documentImages]) {
      if (!seen.has(a.url)) {
        seen.add(a.url)
        out.push(a)
      }
    }
    return out
  }, [providerAssets, documentImages])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const asset = await provider.upload(file)
      onChange(asset.url)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
        className="w-full rounded border border-ed-border-2 bg-ed-surface px-1.5 py-1 text-sm text-ed-text"
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded border border-dashed border-ed-border-2 px-2 py-1.5 text-xs text-ed-text-muted hover:border-ed-border-strong hover:bg-ed-surface-2 disabled:opacity-50"
        >
          <ImageUp size={12} aria-hidden />
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded border border-ed-border-2 px-2 py-1.5 text-xs text-ed-text-muted hover:border-ed-border-strong hover:bg-ed-surface-2"
        >
          <Images size={12} aria-hidden />
          Library
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Image library</DialogTitle>
          </DialogHeader>
          {assets.length === 0 ? (
            <div className="py-16 text-center text-sm text-ed-text-muted">
              No images yet. Upload one or paste a URL.
            </div>
          ) : (
            <div className="grid max-h-[70vh] grid-cols-5 gap-3 overflow-y-auto p-1">
              {assets.map((asset) => (
                <button
                  key={asset.url}
                  type="button"
                  title={asset.url}
                  onClick={() => {
                    onChange(asset.url)
                    setLibraryOpen(false)
                  }}
                  className={cn(
                    'aspect-square overflow-hidden rounded border',
                    asset.url === value
                      ? 'border-ed-accent ring-2 ring-ed-accent/40'
                      : 'border-ed-border hover:border-ed-border-strong',
                  )}
                >
                  <img
                    src={asset.thumbnail ?? asset.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
