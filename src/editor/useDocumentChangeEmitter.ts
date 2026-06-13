import { useCallback, useEffect, useRef } from 'react'
import type { useEditor } from '@craftjs/core'
import type { EditorDocument } from '@/persistence/schema'
import { buildEnvelope } from './document/envelope'

type CraftQuery = ReturnType<typeof useEditor>['query']

export const DEFAULT_ONCHANGE_DEBOUNCE_MS = 150

// Phase 23 § Decision 2 — `onChange` rides Craft's `onNodesChange`.
//
// Craft's `onNodesChange(query)` fires on every tree mutation INCLUDING
// `setProp` (prop/style edits), so it's a sufficient change source — no
// editorStore polling or DOM hacks. We debounce (a single edit drag can fire
// dozens of times) and emit the full envelope.
//
// `serializedRef` is shared with ControlledHydrator: it holds the last
// craftJson that host + editor agree on. The emitter skips emitting when the
// freshly-serialized tree equals it (so a programmatic apply doesn't echo back
// as a user "change"), and ControlledHydrator skips re-applying a `value`
// whose craftJson already matches it (so onChange→setState→value→apply can't
// loop).
export function useDocumentChangeEmitter(
  onChange: ((doc: EditorDocument) => void) | undefined,
  debounceMs: number = DEFAULT_ONCHANGE_DEBOUNCE_MS,
) {
  const serializedRef = useRef<string | null>(null)
  // Read handler at fire-time so a changed `onChange` prop is honored even
  // though Craft captures the `onNodesChange` option early.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingQuery = useRef<CraftQuery | null>(null)

  const flush = useCallback(() => {
    timer.current = null
    const query = pendingQuery.current
    pendingQuery.current = null
    const handler = onChangeRef.current
    if (!query || !handler) return
    const envelope = buildEnvelope(query)
    // Skip the echo of our own programmatic apply (see ControlledHydrator).
    if (envelope.craftJson === serializedRef.current) return
    serializedRef.current = envelope.craftJson
    handler(envelope)
  }, [])

  const onNodesChange = useCallback(
    (query: CraftQuery) => {
      if (!onChangeRef.current) return
      pendingQuery.current = query
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, debounceMs)
    },
    [flush, debounceMs],
  )

  // Flush nothing on unmount, just clear the pending timer.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return { onNodesChange, serializedRef }
}
