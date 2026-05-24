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
