import { z } from 'zod'
import { registerComponent } from '../registry'

// Phase 7 — Tabs is multi-canvas via a DYNAMIC canvasSlots function: one
// canvas per `props.tabs` entry, prefixed `tab-` so the slot keys can't
// collide with the styleSlots ('root' / 'tabs' / 'content'). Each tab's
// content is dropped into the corresponding canvas by the adapter impl.
//
// Limitation: renaming a tab's `value` orphans the linked node for that
// tab's previous value. Designers see this as "I renamed the tab and its
// content disappeared." Phase 8 polish can add stable per-tab ids; for
// Phase 7 the trade-off is documented and the array editor's reorder
// preserves values, so renames are the only foot-gun.
export const tabsPropsSchema = z.object({
  tabs: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    }),
  ),
  defaultValue: z.string(),
})
export type TabsProps = z.infer<typeof tabsPropsSchema>

export const TAB_SLOT_PREFIX = 'tab-'

/**
 * Synthesizes a unique render value per tab so Radix / MUI can distinguish
 * panels even when the user-authored `value` is empty (newly-added tabs from
 * the PropsPanel "+ Add" button) or collides with a sibling.
 *
 * Returns one synthetic value per input tab, in index order:
 *   - Unique non-empty `value` → passes through unchanged.
 *   - Empty `value` → `_unset_<index>`.
 *   - Duplicate `value` → first occurrence keeps the value; second gets
 *     `<value>__1`, third `<value>__2`, etc.
 *
 * The synthetic values back both Radix's panel switching AND the canvas
 * slotChildren key (`canvasSlots` uses the same helper), so a synthesized
 * value's dropped children land in the right panel.
 *
 * Limitation: renaming a tab's `value` still orphans its canvas content
 * because the slot key changes. PRODUCTION_READINESS § 2.11 (stable per-tab
 * ids) tracks the deeper fix.
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
    return uniqueTabValues(tabs).map((v) => `${TAB_SLOT_PREFIX}${v}`)
  },
  propsSchema: tabsPropsSchema,
  defaults: {
    props: {
      tabs: [
        { value: 'overview', label: 'Overview' },
        { value: 'details', label: 'Details' },
        { value: 'settings', label: 'Settings' },
      ],
      defaultValue: 'overview',
    },
    style: {
      classes: { root: '', tabs: '', content: '' },
    },
  },
})
