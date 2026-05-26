/**
 * Phase 11 § 3.3 — merge parsed style slices across N nodes for multi-
 * select Inspector panels.
 *
 * Each panel's parser (parseSize, parseLayout, parseSpacing, …) returns
 * a `{ slice }` object whose fields hold the resolved Tailwind token
 * for each style property. This helper takes N such slices and:
 *
 *   - For every field that's identical across all slices (including
 *     `undefined`), it copies the value into `merged`.
 *   - For every field that DIFFERS across at least one pair, it sets
 *     `merged[field] = undefined` and adds the field to the `mixed`
 *     Set so the panel can render the "—" indicator.
 *
 * Single-node case (slices.length === 1): every field is "same"
 * (trivially), `mixed` is empty, `merged` equals the only slice. So
 * panels can use the same code path for single + multi.
 *
 * Pure function — easy to unit-test without React.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeSlices<S extends Record<string, any>>(
  slices: readonly S[],
): { merged: Partial<S>; mixed: Set<keyof S> } {
  if (slices.length === 0) {
    return { merged: {} as Partial<S>, mixed: new Set() }
  }
  if (slices.length === 1) {
    return { merged: { ...slices[0] }, mixed: new Set() }
  }

  // Collect every key any slice defines. Undefined-valued keys still
  // count as defined (an entry of `{ w: undefined }` should be treated
  // as "all slices agree this is undefined").
  const allKeys = new Set<keyof S>()
  for (const s of slices) {
    for (const k of Object.keys(s)) {
      allKeys.add(k as keyof S)
    }
  }

  const merged: Partial<S> = {}
  const mixed = new Set<keyof S>()

  for (const key of allKeys) {
    const first = slices[0][key]
    let same = true
    for (let i = 1; i < slices.length; i++) {
      if (slices[i][key] !== first) {
        same = false
        break
      }
    }
    if (same) {
      merged[key] = first
    } else {
      mixed.add(key)
    }
  }
  return { merged, mixed }
}
