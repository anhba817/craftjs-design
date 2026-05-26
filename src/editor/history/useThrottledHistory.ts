import { useEditor } from '@craftjs/core'
import { useCallback } from 'react'

// Phase 11 § 3.1 — undo/redo grouping.
//
// Craft.js exposes `actions.history.throttle(rate)` which returns a
// scoped actions object. Calls through that scope within `rate` ms of
// the previous call collapse into one undo step. This hook is the
// canonical wrapper so call sites don't have to remember the prefix.
//
// Why an indirection: each gesture (slider scrub, color drag, gradient
// stop drag, resize) calls multiple setProp ticks at near-frame rate.
// Without throttling, every tick lands in the history timeline and the
// user sees one undo per tick instead of one per gesture. With
// throttling, one gesture = one undo step.
//
// Default rate (500ms) matches "user paused briefly mid-gesture" — long
// enough to absorb a continuous drag, short enough that two distinct
// actions ~1s apart land as separate undo steps. Call sites can
// override.
//
// Identity is intentionally stable across renders so consumers can
// store the returned object in a ref without stale-closure concerns.

export const DEFAULT_THROTTLE_MS = 500

export function useThrottledHistory(throttleMs: number = DEFAULT_THROTTLE_MS) {
  const { actions } = useEditor()

  const setProp = useCallback(
    <P>(nodeId: string, cb: (props: P) => void) => {
      actions.history.throttle(throttleMs).setProp(nodeId, cb)
    },
    [actions, throttleMs],
  )

  const setCustom = useCallback(
    <T>(nodeId: string, cb: (custom: T) => void) => {
      actions.history.throttle(throttleMs).setCustom(nodeId, cb)
    },
    [actions, throttleMs],
  )

  return { setProp, setCustom }
}

// Test helper — exported separately so callers that need to verify the
// throttle behaviour (e.g. via mocked actions) can introspect the
// expected interval. Don't import in production code.
export function _throttleRateForTests(): number {
  return DEFAULT_THROTTLE_MS
}
