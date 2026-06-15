// Public SDK — host-supplied template variables (Phase 26).
//
// Wrap the editor in <EditorTemplateVariablesProvider> to let users insert
// `{{ key }}` merge tokens into text content (Text / Heading / Button) from a
// picker, and to preview them on the canvas. The document stores only the
// tokens; pass real values to <DocumentRenderer variables> at render time.
//
// @example
//   import { EditorTemplateVariablesProvider } from '@crafted-design/editor/sdk'
//
//   <EditorTemplateVariablesProvider
//     variables={[
//       { key: 'contact.name',  label: 'Full name', group: 'Contact', sample: 'Jane Doe' },
//       { key: 'contact.title', label: 'Title',     group: 'Contact', sample: 'CTO' },
//     ]}
//     values={{ 'contact.name': liveName }}  // optional live preview values
//   >
//     <Editor />
//   </EditorTemplateVariablesProvider>
//
// Syntax is `{{ path.to.var }}` interpolation only (dot-paths; a safe subset
// valid as Jinja/Mustache for that case) — no control flow or filters.

export {
  EditorTemplateVariablesProvider,
  useTemplateVariables,
} from '../editor/variables/EditorTemplateVariablesProvider'
export type { TemplateVariable } from '../editor/variables/EditorTemplateVariablesProvider'
export type { TemplateValues } from '../headless/interpolate'
