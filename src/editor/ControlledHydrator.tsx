import { useEditor } from '@craftjs/core'
import { useEffect, useRef } from 'react'
import type { EditorDocument } from '@/persistence/schema'
import { applyEnvelopeSafely } from './errors/applyEnvelopeSafely'
import { normalizeDocument } from './document/envelope'

// Phase 23 § Decision 1 — controlled hydration.
//
// When the host passes <Editor value=…>, the editor is a controlled component:
// `value` is the single source of truth, the persistence Hydrator is bypassed,
// and THIS component re-applies the envelope whenever `value`'s identity
// changes (the supported re-seed path — e.g. an SPA stepping to a different
// document). Independent of the §2.1 module-level latch entirely.
//
// Loop guard (Risk #1): edit → onChange → host setState → new `value` →
// re-apply → onChange… To break it we track the last envelope we applied AND
// the last serialized tree onChange emitted; if an incoming `value` matches
// what's already on the canvas, applying it is skipped (a no-op deserialize
// would still be wasteful and could clobber selection). The comparison is on
// the serialized craftJson string, which is the canonical identity of the
// tree.
export function ControlledHydrator({
  value,
  serializedRef,
}: {
  value: EditorDocument | string
  // The latest craftJson string the editor has emitted via onChange (or
  // applied). Shared with the onChange wiring so an echo of our own edit
  // doesn't trigger a re-deserialize.
  serializedRef: React.RefObject<string | null>
}) {
  const { actions, query } = useEditor()
  // Identity of the last `value` we applied — guards against re-applying the
  // same prop object/string React may hand us across unrelated re-renders.
  const lastAppliedValue = useRef<EditorDocument | string | null>(null)

  useEffect(() => {
    if (value === lastAppliedValue.current) return

    let envelope: EditorDocument
    try {
      envelope = normalizeDocument(value)
    } catch (err) {
      console.warn('[Editor] controlled `value` is not a valid document:', err)
      return
    }

    // If the incoming value already matches the live tree (an echo of our own
    // onChange round-tripped through the host), don't re-deserialize.
    if (envelope.craftJson === serializedRef.current) {
      lastAppliedValue.current = value
      return
    }

    void applyEnvelopeSafely(actions, 'controlled', envelope).then(() => {
      lastAppliedValue.current = value
      // Record what's now on the canvas so the next onChange tick can tell a
      // genuine user edit from this programmatic apply.
      try {
        serializedRef.current = query.serialize()
      } catch {
        // query may briefly be unavailable mid-teardown; ignore.
      }
    })
  }, [value, actions, query, serializedRef])

  return null
}

// Phase 23 § Decision 1 (defaultValue) — uncontrolled seed: applies the
// envelope ONCE on mount and then ignores prop changes (edits live in the
// editor and surface via onChange). Used for an embed that owns the document
// itself (`defaultValue` + `persistence={false}` + `onChange`).
export function DefaultValueSeeder({
  value,
  serializedRef,
}: {
  value: EditorDocument | string
  serializedRef: React.RefObject<string | null>
}) {
  const { actions, query } = useEditor()
  const seeded = useRef(false)

  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    let envelope: EditorDocument
    try {
      envelope = normalizeDocument(value)
    } catch (err) {
      console.warn('[Editor] `defaultValue` is not a valid document:', err)
      return
    }
    void applyEnvelopeSafely(actions, 'default', envelope).then(() => {
      // Seeding isn't a user edit — record it so onChange skips the echo.
      try {
        serializedRef.current = query.serialize()
      } catch {
        /* ignore */
      }
    })
    // Mount-only seed — `value` deliberately excluded so later defaultValue
    // changes don't re-seed (that's what `value` / controlled mode is for).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
