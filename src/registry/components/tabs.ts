import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 7 — Tabs is multi-canvas via a DYNAMIC canvasSlots function: one
// canvas per `props.tabs` entry. Each tab's content is dropped into the
// corresponding canvas by the adapter impl.
//
// Phase 10 § 2.11 — every tab now carries a stable `id` (auto-generated
// for new tabs, migrated from `uniqueTabValues` output for legacy
// documents). canvasSlots keys on `id`, so renaming a tab's `value` no
// longer orphans canvas content. `uniqueTabValues` stays as a fallback
// for documents that somehow have a tab without an id.

/**
 * Random tab id. Lowercased base36 with a `tab-` prefix to align with the
 * slot-key prefix below. ~30 bits of entropy is plenty for a per-document
 * id space (documents rarely have more than a few dozen tabs).
 */
function genTabId(): string {
  return `tab-${Math.random().toString(36).slice(2, 10)}`
}

export const tabsPropsSchema = z.object({
  tabs: z.array(
    z.object({
      // The slot key — stable across renames. ArrayField's defaultValueFor
      // path picks up the `.default(() => ...)` to seed new tabs with a
      // fresh id; the migration in src/persistence/migrations.ts injects
      // ids for legacy documents.
      id: z.string().default(() => genTabId()),
      value: z.string(),
      label: z.string(),
    }),
  ),
  defaultValue: z.string(),
})
export type TabsProps = z.infer<typeof tabsPropsSchema>

export const TAB_SLOT_PREFIX = 'tab-'

/**
 * Resolves the slot key for each tab. Phase 10 uses `tab.id` as the
 * source of truth — stable across `value` renames. The fallback to
 * `uniqueTabValues(tabs)[index]` covers (a) documents that somehow
 * escaped the migration with id-less tabs, and (b) defensive coding
 * in case a future hand-edit drops the field.
 *
 * Returned in input order; same length as `tabs`.
 */
export function tabSlotKeys(
  tabs: readonly { id?: string; value: string }[],
): string[] {
  const fallback = uniqueTabValues(tabs)
  return tabs.map((t, i) => `${TAB_SLOT_PREFIX}${t.id ?? fallback[i]}`)
}

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

registerComponent<TabsProps>({
  id: 'tabs',
  category: 'navigation',
  displayName: 'Tabs',
  tags: ['nav', 'tabs', 'segmented'],
  isCanvas: false,
  styleSlots: ['root', 'tabs', 'content'],
  canvasSlots: (props) => {
    const tabs = (props as TabsProps).tabs ?? []
    return tabSlotKeys(tabs)
  },
  propsSchema: tabsPropsSchema,
  defaults: {
    props: {
      // Explicit ids on the built-in defaults so a freshly-dropped Tabs
      // canonical doesn't depend on the schema's `.default(() => ...)`
      // running (defaultValueFor in ArrayField triggers that path; the
      // canonical's `defaults` object is read verbatim).
      tabs: [
        { id: 'tab-overview', value: 'overview', label: 'Overview' },
        { id: 'tab-details', value: 'details', label: 'Details' },
        { id: 'tab-settings', value: 'settings', label: 'Settings' },
      ],
      defaultValue: 'overview',
    },
    style: {
      classes: { root: '', tabs: '', content: '' },
    },
  },
})
