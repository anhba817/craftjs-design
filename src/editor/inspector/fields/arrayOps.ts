// Pure array operations used by ArrayField. Extracted so the reorder logic is
// unit-testable without rendering React — vitest runs without a DOM, so testing
// the DnD UI itself isn't possible here. These helpers cover what's worth
// testing: the index arithmetic.

export function reorder<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return items
  const clamped = Math.max(0, Math.min(to, items.length - 1))
  if (from === clamped) return items
  const next = items.slice()
  const [moved] = next.splice(from, 1)
  next.splice(clamped, 0, moved)
  return next
}

export function removeAt<T>(items: T[], index: number): T[] {
  if (index < 0 || index >= items.length) return items
  return items.filter((_, i) => i !== index)
}

export function setAt<T>(items: T[], index: number, value: T): T[] {
  const next = items.slice()
  next[index] = value
  return next
}

// Swap two adjacent positions. Used by the ↑/↓ button fallback. Kept distinct
// from reorder() so the button labels match user intent ("move up by one"
// rather than "splice/insert"): symmetrical and obvious.
export function swap<T>(items: T[], a: number, b: number): T[] {
  if (a < 0 || b < 0 || a >= items.length || b >= items.length || a === b) {
    return items
  }
  const next = items.slice()
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}
