import type { EditorProps } from './Editor'

// Phase 23 § Decision 1 + 4 — the embedding-mode resolution, pulled out as a
// pure function so the precedence is locked by a unit test rather than buried
// in the component:
//
//   - `value` present  → controlled; persistence is FORCED off (`value` is the
//     single source of truth, the store would fight it).
//   - otherwise         → persistence follows the `persistence` prop, default
//     `true` (standalone behavior unchanged).
export function resolveEmbeddingMode({
  value,
  persistence,
}: Pick<EditorProps, 'value' | 'persistence'>): {
  controlled: boolean
  persist: boolean
} {
  const controlled = value !== undefined
  return { controlled, persist: controlled ? false : persistence ?? true }
}
