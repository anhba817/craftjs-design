import type { useEditor } from '@craftjs/core'
import { useEditorStore } from '@/state/editorStore'
import type { EditorDocument } from '@/persistence/schema'
import { validateCraftJson } from './craftJsonIntegrity'

// Phase 9 § 1.9 — shared "apply with malformed-recovery" path.
//
// Both Hydrator (boot) and useDocumentSwitcher (runtime switch) call
// actions.deserialize. If the envelope is structurally broken or
// Craft.js throws during deserialize, the editor must:
//   1. NOT leave Craft in a half-applied state.
//   2. Surface a banner the user can act on.
//
// This helper does both:
//   - Runs the integrity pre-check first. If it fails, we never call
//     deserialize → Craft stays in its prior state → the banner renders
//     in place of the Frame's canvas.
//   - Wraps the actual deserialize in try/catch. On throw, sets the
//     malformed state (banner shows) and returns { ok: false }.
//   - Also applies the doc's theme + adapter on success, mirroring the
//     two existing inline applyEnvelope() copies.

type CraftActions = ReturnType<typeof useEditor>['actions']

export interface ApplyEnvelopeResult {
  ok: boolean
  // When ok=false, the malformed state has already been set in
  // editorStore; callers don't need to do anything else.
  error?: Error
}

export function applyEnvelopeSafely(
  actions: CraftActions,
  docId: string,
  envelope: EditorDocument,
): ApplyEnvelopeResult {
  const { setMalformedDocument } = useEditorStore.getState()

  const check = validateCraftJson(envelope.craftJson)
  if (!check.ok) {
    setMalformedDocument({ docId, envelope, error: check.error })
    return { ok: false, error: check.error }
  }
  try {
    actions.deserialize(envelope.craftJson)
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    setMalformedDocument({ docId, envelope, error })
    return { ok: false, error }
  }
  // Success path: clear any prior malformed state + apply theme/adapter.
  if (useEditorStore.getState().malformedDocument) {
    setMalformedDocument(null)
  }
  if (envelope.themeId) useEditorStore.getState().setActiveTheme(envelope.themeId)
  useEditorStore.getState().setActiveAdapter(envelope.adapterId)
  return { ok: true }
}
