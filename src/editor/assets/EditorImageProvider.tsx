import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'

// Phase 11 § 3.10 — host-pluggable image backend.
//
// The editor doesn't assume where images live. A host app wraps the
// editor in <EditorImageProvider value={...}> to route uploads to
// S3 / its CDN / wherever. When no host provider is present, a
// default base64 provider inlines the bytes as a data: URL so the
// editor still works standalone (the demo / dev environment).
//
// The ImagePicker (PropsPanel's src field) and the AssetLibraryPanel
// both consume this via useEditorImageProvider().

export interface EditorImageAsset {
  /** Canonical URL written into the Image node's `src` prop. */
  url: string
  /** Optional smaller preview URL for the library grid. */
  thumbnail?: string
}

export interface EditorImageProviderValue {
  /**
   * Persist a file and resolve to its canonical URL. The default
   * provider returns a data: URL; a host provider returns a hosted
   * URL.
   */
  upload: (file: File) => Promise<EditorImageAsset>
  /**
   * Previously-uploaded assets for the library grid. The default
   * provider can't enumerate inline data URLs, so it returns [] and
   * sets `canList: false` — the AssetLibraryPanel hides itself and
   * the ImagePicker's Library tab falls back to scanning the current
   * document's Image nodes.
   */
  list: () => Promise<EditorImageAsset[]>
  /** Optional removal. Hosts that support it expose a delete button. */
  delete?: (url: string) => Promise<void>
  /**
   * Whether `list()` returns meaningful results. Drives whether the
   * AssetLibraryPanel renders and whether the picker shows a real
   * library tab vs the document-scan fallback.
   */
  canList: boolean
}

// Soft cap for the default inline provider. Above this we still
// encode (we don't want to silently fail), but we warn so the
// designer knows the document will get heavy + localStorage may
// hit quota.
const INLINE_WARN_BYTES = 500 * 1024

// Session memory of everything the default provider has uploaded this
// session. Needed so the ImagePicker library shows ALL uploads, not
// just whatever src happens to be on a node right now — uploading
// twice to the same node overwrites its src, so a document scan alone
// would only ever surface the latest. Module-scoped; resets on reload
// (acceptable for an ephemeral inline provider).
const sessionUploads: EditorImageAsset[] = []

/**
 * Default provider: encode the file to a base64 data: URL inline and
 * remember it for the session so list() can surface it. Used whenever
 * the host doesn't wrap the editor in its own <EditorImageProvider>.
 *
 * `canList` stays false: the session list is ephemeral and small, so
 * the standalone Assets inspector panel stays host-only. The
 * ImagePicker's library modal calls list() directly regardless of
 * canList and unions it with the current document's images.
 */
export const defaultImageProvider: EditorImageProviderValue = {
  async upload(file: File): Promise<EditorImageAsset> {
    if (file.size > INLINE_WARN_BYTES) {
      console.warn(
        `[craftjs-design] Image "${file.name}" is ${(file.size / 1024).toFixed(
          0,
        )} KB. The default image provider inlines bytes as a base64 data URL, ` +
          `which bloats the document and can exceed localStorage quota. Supply a ` +
          `host <EditorImageProvider> to upload to a real backend.`,
      )
    }
    const url = await readFileAsDataUrl(file)
    const asset: EditorImageAsset = { url }
    if (!sessionUploads.some((a) => a.url === url)) {
      sessionUploads.push(asset)
    }
    return asset
  },
  async list(): Promise<EditorImageAsset[]> {
    return [...sessionUploads]
  },
  canList: false,
}

// Test-only: clear the session-uploads memory between cases.
export function _resetDefaultImageProviderForTests(): void {
  sessionUploads.length = 0
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

const EditorImageContext = createContext<EditorImageProviderValue>(
  defaultImageProvider,
)

/**
 * Host integration point. Wrap the editor:
 *
 * ```tsx
 * <EditorImageProvider value={myBackend}>
 *   <Editor />
 * </EditorImageProvider>
 * ```
 *
 * `value` may omit `canList` for convenience — it defaults to
 * `true` when a custom `list` is supplied (hosts that pass a
 * provider almost always can list). Pass `canList: false`
 * explicitly to opt out.
 */
export function EditorImageProvider({
  value,
  children,
}: {
  value: Partial<EditorImageProviderValue> &
    Pick<EditorImageProviderValue, 'upload' | 'list'>
  children: ReactNode
}) {
  const resolved = useMemo<EditorImageProviderValue>(
    () => ({
      upload: value.upload,
      list: value.list,
      delete: value.delete,
      canList: value.canList ?? true,
    }),
    [value],
  )
  return (
    <EditorImageContext.Provider value={resolved}>
      {children}
    </EditorImageContext.Provider>
  )
}

/** Read the active image provider (default base64 when unwrapped). */
export function useEditorImageProvider(): EditorImageProviderValue {
  return useContext(EditorImageContext)
}
