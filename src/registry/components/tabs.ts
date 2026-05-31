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

// Slot-key helpers live in the side-effect-free `dynamic-slots` module so the
// SDK can re-export them without pulling in this canonical's registration
// (Phase 17 § 8.4). Imported here for the `canvasSlots` derivation below and
// re-exported for back-compat — adapter impls in this repo import them from
// `@/registry/components/tabs`.
import {
  TAB_SLOT_PREFIX,
  tabSlotKeys,
  uniqueTabValues,
} from './dynamic-slots'
export { TAB_SLOT_PREFIX, tabSlotKeys, uniqueTabValues }

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
