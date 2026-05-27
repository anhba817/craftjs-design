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
//
// Phase 9 § 1.10 — hydration race conditions.
//
// Apply calls are serialized via a promise chain. Each call enqueues work
// behind any prior in-flight apply; the work runs as a microtask. A
// generation counter pins each call to its own "version" — when a work
// task finally runs, it checks whether a newer call has been enqueued
// since. If so it skips, on the understanding that the newer call will
// take care of replacing the canvas. This collapses rapid-fire applies
// (e.g., user clicks doc B while doc A is mid-load) to a single
// "latest wins" outcome instead of the editor flickering through every
// intermediate state.
//
// The queue is module-scoped intentionally — there's exactly one Craft
// editor at a time, and serialising at that level is the right grain.

type CraftActions = ReturnType<typeof useEditor>['actions']

export interface ApplyEnvelopeResult {
  ok: boolean
  // True when the call was superseded by a later applyEnvelopeSafely
  // before its turn in the queue. The newer call will handle the work;
  // callers can usually ignore this.
  superseded?: boolean
  // When ok=false, the malformed state has already been set in
  // editorStore; callers don't need to do anything else.
  error?: Error
}

let queue: Promise<unknown> = Promise.resolve()
let generation = 0

export function applyEnvelopeSafely(
  actions: CraftActions,
  docId: string,
  envelope: EditorDocument,
): Promise<ApplyEnvelopeResult> {
  generation += 1
  const myGen = generation

  const work = (): ApplyEnvelopeResult => {
    if (myGen !== generation) {
      // A later applyEnvelopeSafely call has overwritten us. Skip —
      // the latest one will land the actual content.
      return { ok: true, superseded: true }
    }
    return runApply(actions, docId, envelope)
  }

  const next = queue.then(work, work)
  // Swallow rejections at the queue level so one failure doesn't block
  // subsequent applies. (work itself doesn't throw — failures route to
  // setMalformedDocument and a resolved { ok: false } — but defensive
  // here.)
  queue = next.catch(() => undefined)
  return next
}

// Test-only — resets the module-level queue + generation so each test
// sees a fresh state. The implementation is intentionally private to
// this module; tests import via the named export below.
export function _resetQueueForTests(): void {
  queue = Promise.resolve()
  generation = 0
}

function runApply(
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
  // Success: clear any prior malformed state + apply theme/adapter.
  if (useEditorStore.getState().malformedDocument) {
    setMalformedDocument(null)
  }
  if (envelope.themeId)
    useEditorStore.getState().setActiveTheme(envelope.themeId)
  if (envelope.colorMode)
    useEditorStore.getState().setColorMode(envelope.colorMode)
  useEditorStore.getState().setActiveAdapter(envelope.adapterId)
  // Phase 11 § 3.3 — selection ids reference nodes in the OLD craftJson
  // tree. After deserialize swaps the tree they're invalid; clear so
  // the Inspector / breadcrumbs / overlays don't briefly point at
  // dead nodes. Also clear the clipboard's tree if it referenced
  // doc-local ids (the user copies from doc A, switches to doc B —
  // paste should NOT splice doc A's tree into doc B).
  useEditorStore.getState().clearSelection()
  useEditorStore.getState().setClipboard(null)
  // Phase 11 § 3.11 — likewise the editing-text node id is stale.
  useEditorStore.getState().setEditingTextNode(null)
  return { ok: true }
}
