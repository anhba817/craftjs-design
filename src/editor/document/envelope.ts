import type { useEditor } from '@craftjs/core'
import { useEditorStore } from '@/state/editorStore'
import { migrateDocument } from '@/persistence/migrations'
import { parseDocumentJson } from '@/persistence/importDocument'
import {
  CURRENT_DOCUMENT_VERSION,
  documentSchema,
  type EditorDocument,
} from '@/persistence/schema'

// Phase 23 § Decision 3 — the ONE serialization path.
//
// `buildEnvelope` / `applyEnvelope` used to live as private closures inside
// SaveLoadBar.tsx, unreachable from the host. The controlled API (value /
// onChange / imperative ref) needs the same build + apply logic, so both are
// hoisted here and SaveLoadBar, the controlled hydrator, onChange, and the
// imperative ref all share this single path — no drift between "what Save
// writes" and "what onChange emits".

type CraftQuery = ReturnType<typeof useEditor>['query']
type CraftActions = ReturnType<typeof useEditor>['actions']

// Serialize the current Craft tree + the editor store's adapter / theme /
// color-mode into the persisted envelope shape. Reads the store via
// getState() (not a hook) so it's callable from event handlers and the
// debounced onChange tick.
export function buildEnvelope(query: CraftQuery): EditorDocument {
  const { activeThemeId, activeAdapterId, colorMode } = useEditorStore.getState()
  return {
    version: CURRENT_DOCUMENT_VERSION,
    adapterId: activeAdapterId,
    themeId: activeThemeId,
    colorMode,
    craftJson: query.serialize(),
  }
}

// Apply an envelope to the live editor: deserialize the tree, then mirror its
// theme / color-mode / adapter into the editor store. The plain (non-recovery)
// path used by Save/Load/Import and the controlled hydrator's happy case;
// boot + runtime-switch use `applyEnvelopeSafely` for malformed recovery.
export function applyEnvelope(actions: CraftActions, doc: EditorDocument): void {
  actions.deserialize(doc.craftJson)
  const store = useEditorStore.getState()
  if (doc.themeId) store.setActiveTheme(doc.themeId)
  if (doc.colorMode) store.setColorMode(doc.colorMode)
  store.setActiveAdapter(doc.adapterId)
}

// Normalize a controlled `value` / `defaultValue` / imperative `setDocument`
// input — an envelope object OR its JSON string — into a validated, migrated
// envelope. Strings go through `parseDocumentJson` (validate + migrate);
// objects are schema-checked then migrated, so a controlled host gets the same
// robustness as an Import.
export function normalizeDocument(
  value: EditorDocument | string,
): EditorDocument {
  if (typeof value === 'string') return parseDocumentJson(value)
  return migrateDocument(documentSchema.parse(value))
}
