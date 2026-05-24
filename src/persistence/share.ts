import LZString from 'lz-string'
import { migrateDocument } from './migrations'
import { documentSchema } from './schema'
import type { EditorDocument } from './schema'

// Phase 7 shareable URLs. Documents round-trip through:
//   JSON.stringify → LZString.compressToEncodedURIComponent → URL fragment
// The encoded form is URL-safe (no further escaping needed). On boot, the
// Hydrator inspects window.location.hash for `#doc=…` and offers to load.

// Conservative cap. Different browsers truncate at different lengths; 30 KB
// is comfortably under Chrome / Firefox / Edge limits. Larger documents fall
// back to clipboard-copy of the JSON.
export const SHARE_URL_MAX_PAYLOAD = 30_000

export const SHARE_FRAGMENT_KEY = 'doc'

export interface EncodeResult {
  encoded: string
  byteLength: number
  exceedsLimit: boolean
}

export function encodeDocument(doc: EditorDocument): EncodeResult {
  const json = JSON.stringify(documentSchema.parse(doc))
  const encoded = LZString.compressToEncodedURIComponent(json)
  return {
    encoded,
    byteLength: encoded.length,
    exceedsLimit: encoded.length > SHARE_URL_MAX_PAYLOAD,
  }
}

export class DecodeError extends Error {
  readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'DecodeError'
    this.cause = cause
  }
}

export function decodeDocument(encoded: string): EditorDocument {
  const json = LZString.decompressFromEncodedURIComponent(encoded)
  if (json === null || json === '') {
    throw new DecodeError('Shared document is empty or unreadable.')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (cause) {
    throw new DecodeError("Shared document isn't valid JSON.", cause)
  }
  let envelope: EditorDocument
  try {
    envelope = documentSchema.parse(parsed)
  } catch (cause) {
    throw new DecodeError(
      "Shared document doesn't match the envelope shape.",
      cause,
    )
  }
  return migrateDocument(envelope)
}

// Builds a complete URL with the document encoded into the fragment. Pass the
// site's base URL (typically `window.location.origin + window.location.pathname`).
export function shareUrlFor(doc: EditorDocument, baseUrl: string): EncodeResult & { url: string } {
  const result = encodeDocument(doc)
  return {
    ...result,
    url: `${baseUrl}#${SHARE_FRAGMENT_KEY}=${result.encoded}`,
  }
}

// Reads the current URL fragment looking for a shared document. Returns the
// encoded payload (caller decodes — separated so callers can inspect length
// and prompt before decoding) or null when no shared document is present.
export function readSharedFragment(hash: string): string | null {
  // Strip leading '#' if present, then parse fragment-style query params.
  const cleaned = hash.startsWith('#') ? hash.slice(1) : hash
  if (!cleaned) return null
  // Fragments look like `doc=…&other=…`. We only consume the `doc=` parameter.
  const params = new URLSearchParams(cleaned)
  return params.get(SHARE_FRAGMENT_KEY)
}

export function clearSharedFragment(): void {
  if (typeof window === 'undefined') return
  // Replace the fragment without leaving a history entry. Plain assignment
  // to location.hash would push history; replaceState avoids that.
  const { pathname, search } = window.location
  window.history.replaceState(null, '', `${pathname}${search}`)
}
