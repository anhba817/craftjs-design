// Phase 17 § 8.4 — pure (side-effect-free) slot-key helpers for the
// dynamic-canvas canonicals (Tabs, Carousel).
//
// These live HERE, not in `tabs.ts` / `carousel.ts`, on purpose: those
// modules call `registerComponent(...)` at module load, so importing them
// registers a canonical. The public SDK (`sdk/canonical.ts`) re-exports these
// helpers for third-party adapter authors building a custom Tabs / Carousel
// impl — and the SDK must stay tree-shakable, so importing it can't drag in
// canonical registration. `tabs.ts` / `carousel.ts` re-export from here for
// back-compat (existing `@/registry/components/{tabs,carousel}` imports keep
// working); importing THIS module registers nothing.

export const TAB_SLOT_PREFIX = 'tab-'
export const SLIDE_SLOT_PREFIX = 'slide-'

/**
 * Synthesises a unique render value per tab. Phase 10's stable-id work
 * (§ 2.11) makes this largely obsolete for slot-key derivation —
 * `tabSlotKeys` handles that now. The helper survives as the source
 * of truth for the Radix/MUI `value` prop (which still keys on the
 * user-authored `value` field), and as the migration path's tool for
 * picking ids that preserve existing slot keys.
 *
 * Returns one synthetic value per input tab, in index order:
 *   - Unique non-empty `value` → passes through unchanged.
 *   - Empty `value` → `_unset_<index>`.
 *   - Duplicate `value` → first occurrence keeps the value; second gets
 *     `<value>__1`, third `<value>__2`, etc.
 */
export function uniqueTabValues(tabs: readonly { value: string }[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < tabs.length; i++) {
    const base = tabs[i].value || `_unset_${i}`
    let v = base
    let suffix = 1
    while (seen.has(v)) {
      v = `${base}__${suffix}`
      suffix++
    }
    seen.add(v)
    out.push(v)
  }
  return out
}

/**
 * Resolves the slot key for each tab. Uses `tab.id` as the source of truth
 * (stable across `value` renames), falling back to `uniqueTabValues(tabs)[i]`
 * for id-less tabs. Returned in input order; same length as `tabs`.
 */
export function tabSlotKeys(
  tabs: readonly { id?: string; value: string }[],
): string[] {
  const fallback = uniqueTabValues(tabs)
  return tabs.map((t, i) => `${TAB_SLOT_PREFIX}${t.id ?? fallback[i]}`)
}

/**
 * Resolves the slot key for each slide. Same shape as `tabSlotKeys`.
 * Double-prefixed (`slide-slide-${id}`) is intentional — `id` already starts
 * with `slide-` from genSlideId, and ALL slot keys share the SLIDE_SLOT_PREFIX
 * so the registry / serializer can recognise them.
 */
export function slideSlotKeys(slides: readonly { id: string }[]): string[] {
  return slides.map((s) => `${SLIDE_SLOT_PREFIX}${s.id}`)
}
