// Phase 11 § 3.3 — pure helpers for modifier-click selection semantics.
//
// Extracted from useMultiSelectClick so the range logic can be unit-
// tested without a DOM. Both helpers return a NEW array — caller is
// responsible for handing the result to editorStore.setSelection.

/**
 * Toggle `id` in `current`. If already present, remove; otherwise
 * append. Used for Cmd/Ctrl-click.
 */
export function toggleId(current: readonly string[], id: string): string[] {
  if (current.includes(id)) {
    return current.filter((x) => x !== id)
  }
  return [...current, id]
}

/**
 * Shift-click range extension within a single parent.
 *
 * Behavior matches typical multi-select UX (Finder, File Explorer):
 *   - If `current` is empty, just select [target].
 *   - Otherwise, find the *anchor* (first element of `current` that
 *     appears in `siblings`). If no anchor is a sibling, fall back
 *     to single-select [target] — cross-parent ranges are confusing.
 *   - Build the inclusive slice between anchor and target indices,
 *     and union it with whatever was already in `current` outside
 *     the slice (so cross-parent extras stick around — matches
 *     Finder's "shift-extends, doesn't replace" behavior).
 *
 * @param current The selection array BEFORE the click.
 * @param target The id that was shift-clicked.
 * @param siblings All sibling ids in DOM order (i.e. parent.data.nodes).
 *   Order is significant: the slice direction depends on it.
 */
export function extendRange(
  current: readonly string[],
  target: string,
  siblings: readonly string[],
): string[] {
  if (current.length === 0) {
    return [target]
  }
  if (!siblings.includes(target)) {
    // Caller should have checked this; defensive fallback.
    return [target]
  }
  // Anchor = the FIRST element of current that's a sibling of target.
  // Choosing "first" matches Finder/Explorer: the original click is
  // the anchor; subsequent toggles don't shift it. Our `current` is
  // stored in click order via toggleSelection / setSelection, so
  // current[0] is the oldest entry — close enough to "anchor".
  const anchor = current.find((id) => siblings.includes(id))
  if (anchor === undefined) {
    return [target]
  }
  const anchorIdx = siblings.indexOf(anchor)
  const targetIdx = siblings.indexOf(target)
  const [lo, hi] =
    anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx]
  const range = siblings.slice(lo, hi + 1)

  // Union with non-sibling members of `current` so cross-parent
  // selections aren't blown away.
  const result: string[] = []
  const seen = new Set<string>()
  for (const id of current) {
    if (!siblings.includes(id) && !seen.has(id)) {
      result.push(id)
      seen.add(id)
    }
  }
  for (const id of range) {
    if (!seen.has(id)) {
      result.push(id)
      seen.add(id)
    }
  }
  return result
}
