import { Element, useEditor } from '@craftjs/core'
import { Copy, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getResolver } from '@/craft/resolver'
import { getComponent } from '@/registry/registry'
import { cn } from '@/lib/utils'
import {
  useEditorImageProvider,
  type EditorImageAsset,
} from './EditorImageProvider'

// Phase 11 § 3.10 — Inspector panel listing assets from the active
// image provider. Only meaningful when the provider can list
// (host-supplied backend); the Inspector filters this panel out
// when provider.canList is false (the default base64 provider).
//
// Each asset: hover reveals two actions —
//   - Copy: write the URL to the system clipboard.
//   - Insert: add a new Image canonical (selection-aware placement,
//     same flow as the Toolbox) with this asset as its src.

export function AssetLibraryPanel() {
  const provider = useEditorImageProvider()
  const { actions, query } = useEditor()
  const [assets, setAssets] = useState<EditorImageAsset[] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!provider.canList) {
      setAssets([])
      return
    }
    provider
      .list()
      .then((list) => {
        if (!cancelled) setAssets(list)
      })
      .catch(() => {
        if (!cancelled) setAssets([])
      })
    return () => {
      cancelled = true
    }
  }, [provider])

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied((c) => (c === url ? null : c)), 1500)
    } catch {
      // Clipboard blocked (no user gesture / permissions). Silent —
      // the Insert action is the primary path anyway.
    }
  }

  const insertImage = (url: string) => {
    const def = getComponent('image')
    if (!def) return
    const resolver = getResolver()
    const Bound = resolver[def.displayName]
    if (!Bound) return

    // Selection-aware placement, mirroring Toolbox.dropDef.
    const selectedId = query.getEvent('selected').all()[0]
    let parentId = 'ROOT'
    let indexToPlaceAt: number | undefined
    if (selectedId) {
      try {
        const node = query.node(selectedId).get()
        if (node.data.isCanvas) {
          parentId = selectedId
        } else {
          parentId = node.data.parent ?? 'ROOT'
          const siblings = query.node(parentId).get().data.nodes ?? []
          const idx = siblings.indexOf(selectedId)
          if (idx >= 0) indexToPlaceAt = idx + 1
        }
      } catch {
        // Selected node vanished — fall back to ROOT append.
      }
    }

    const element = (
      <Element
        is={Bound}
        canvas={def.isCanvas}
        nodeProps={{ ...def.defaults.props, src: url }}
        style={def.defaults.style}
      />
    )
    const tree = query.parseReactElement(element).toNodeTree()
    actions.addNodeTree(tree, parentId, indexToPlaceAt)
  }

  if (assets === null) {
    return <div className="px-1 py-2 text-xs text-gray-400">Loading…</div>
  }
  if (assets.length === 0) {
    return (
      <div className="px-1 py-2 text-xs text-gray-400">
        No assets in the library yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {assets.map((asset) => (
        <div
          key={asset.url}
          className="group relative aspect-square overflow-hidden rounded border border-gray-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.thumbnail ?? asset.url}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              title="Insert as Image"
              onClick={() => insertImage(asset.url)}
              className="flex size-6 items-center justify-center rounded bg-white/90 text-gray-700 hover:bg-white"
            >
              <Plus size={12} aria-hidden />
            </button>
            <button
              type="button"
              title="Copy URL"
              onClick={() => copy(asset.url)}
              className={cn(
                'flex size-6 items-center justify-center rounded bg-white/90 text-gray-700 hover:bg-white',
                copied === asset.url && 'bg-primary text-primary-foreground',
              )}
            >
              <Copy size={12} aria-hidden />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
