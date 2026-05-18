import { documentSchema, STORAGE_KEY } from './schema'
import type { EditorDocument } from './schema'

export function saveDocument(doc: EditorDocument): void {
  const parsed = documentSchema.parse(doc)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
}

export function loadDocument(): EditorDocument | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  return documentSchema.parse(JSON.parse(raw))
}

export function clearDocument(): void {
  localStorage.removeItem(STORAGE_KEY)
}
