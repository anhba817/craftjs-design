import { migrateDocument } from './migrations'
import { documentSchema, STORAGE_KEY } from './schema'
import type { EditorDocument } from './schema'

export function saveDocument(doc: EditorDocument): void {
  const parsed = documentSchema.parse(doc)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
}

export function loadDocument(): EditorDocument | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const parsed = documentSchema.parse(JSON.parse(raw))
  return migrateDocument(parsed)
}

export function clearDocument(): void {
  localStorage.removeItem(STORAGE_KEY)
}
