// Public SDK — starter-template registration surface.
//
// A template is an `EditorDocument` envelope plus picker metadata
// (name + short description). Templates appear in the
// "New from template…" menu; picking one creates a fresh document
// with the template's envelope as the starting state.
//
// @example
//   import { registerTemplate } from '@crafted-design/editor/sdk'
//
//   registerTemplate({
//     id: 'landing-page',
//     name: 'Landing page',
//     description: 'Hero + features + CTA scaffold',
//     envelope: {
//       version: 1,
//       adapterId: 'shadcn',
//       craftJson: '...',
//     },
//   })
//
// Construct the envelope's craftJson via the helpers in
// `src/persistence/templates/builder.ts` rather than hand-typing JSON
// to keep templates type-checked against the canonical registry.

export type { TemplateDefinition } from '../persistence/templates/registry'

export {
  registerTemplate,
  unregisterTemplate,
  getTemplate,
  listTemplates,
} from '../persistence/templates/registry'
