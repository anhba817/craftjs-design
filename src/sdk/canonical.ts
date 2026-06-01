// Public SDK — canonical component authoring surface.
//
// A canonical component is the abstract contract behind a palette entry. It
// declares its id, default props, default style, and which inspector panels
// apply. Adapters provide the actual rendering — see ./adapter.
//
// @example
//   import { z } from 'zod'
//   import { registerComponent } from '@design/sdk'
//
//   const stepperSchema = z.object({
//     currentStep: z.number().int().min(0),
//     totalSteps: z.number().int().min(1),
//   })
//
//   registerComponent({
//     id: 'stepper',
//     category: 'navigation',
//     displayName: 'Stepper',
//     tags: ['wizard', 'progress'],
//     isCanvas: false,
//     styleSlots: ['root'],
//     propsSchema: stepperSchema,
//     defaults: {
//       props: { currentStep: 0, totalSteps: 3 },
//       style: { classes: { root: '' } },
//     },
//   })

export type {
  CanonicalComponent,
  CanonicalCategory,
  CanonicalId,
  PanelId,
} from '../registry/types'

export {
  getApplicablePanels,
  getCanvasSlots,
  getComponent,
  getComponentByDisplayName,
  listComponents,
  registerCanonical,
  registerComponent,
  unregisterCanonical,
} from '../registry/registry'

// Phase 10 § 2.14 / Phase 13 § 5.7 — dynamic-canvas slot-key helpers for
// adapter authors building custom Tabs / Carousel impls: they derive the
// canvas slot keys that match what CanonicalNode allocates via each
// canonical's `canvasSlots` function (and, for tabs, the unique `value`-prop
// strings). Imported from the side-effect-free `dynamic-slots` module — NOT
// from `tabs.ts` / `carousel.ts` — so re-exporting them here doesn't drag the
// Tabs/Carousel canonical *registration* into the (tree-shakable) SDK
// (Phase 17 § 8.4). The `*Props` types stay on the canonical modules: type
// re-exports are erased, so they carry no registration side effect.
export {
  TAB_SLOT_PREFIX,
  tabSlotKeys,
  uniqueTabValues,
  SLIDE_SLOT_PREFIX,
  slideSlotKeys,
  // Phase 18 — Stepper + Table dynamic-canvas helpers, same role: a custom
  // Stepper/Table adapter derives the per-step / per-cell canvas slot keys
  // that CanonicalNode allocates, and (Table) resolves merged-cell geometry.
  STEP_SLOT_PREFIX,
  stepperSlotKey,
  stepperSlotKeys,
  CELL_PREFIX,
  tableCellSlotKey,
  tableCellSlotKeys,
  containingMerge,
  isCellCovered,
} from '../registry/components/dynamic-slots'
// `TableMerge` (the per-merge rectangle type the Table helpers operate on).
export type { TableMerge } from '../registry/components/table'
// `TabsProps` / `CarouselProps` (and every other canonical's prop type) are
// re-exported from ./canonical-props.
