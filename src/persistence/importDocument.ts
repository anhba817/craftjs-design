import { migrateDocument } from './migrations'
import { documentSchema } from './schema'
import type { EditorDocument } from './schema'

// Typed error wrapping for import failures. The editor surfaces the message
// to the user via an alert / toast — keep the messages short and actionable.
// The `cause` field preserves the underlying error (Zod, JSON.parse) for
// devtools inspection.
export class ImportError extends Error {
  readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'ImportError'
    this.cause = cause
  }
}

// Pure helper — parses a JSON string into a validated, migrated envelope.
// Two failure modes:
//   1. Input isn't valid JSON → ImportError("isn't valid JSON").
//   2. JSON doesn't match the envelope schema → ImportError("doesn't match").
// On success, the envelope is run through migrateDocument so Phase-5 / Phase-6
// shape documents work after later canonical-shape changes.
export function parseDocumentJson(raw: string): EditorDocument {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (cause) {
    throw new ImportError("Imported file isn't valid JSON.", cause)
  }
  let envelope: EditorDocument
  try {
    envelope = documentSchema.parse(json)
  } catch (cause) {
    throw new ImportError(
      "Imported JSON doesn't match the document envelope shape.",
      cause,
    )
  }
  return migrateDocument(envelope)
}

// Browser-side helper — reads a File (from <input type=file> or a drop event)
// and parses it. Async because File.text() returns a Promise.
export async function importDocumentFromFile(
  file: File,
): Promise<EditorDocument> {
  const raw = await file.text()
  return parseDocumentJson(raw)
}
