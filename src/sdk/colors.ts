// Public SDK — host CSS-variable color source (Phase 12 § 4.9).
//
// Wrap the editor in an <EditorColorVariablesProvider> to surface your own
// CSS custom properties as a color source in the ColorPicker, alongside the
// shadcn theme tokens. Picking one writes `var(--name)` to the element, so
// it tracks your stylesheet at runtime (theme swaps, dark mode, …).
//
// @example
//   import { EditorColorVariablesProvider } from '@crafted-design/editor/sdk'
//
//   <EditorColorVariablesProvider
//     variables={[
//       { name: 'brand-blue', label: 'Brand Blue' },
//       { name: 'brand-ink' },
//     ]}
//   >
//     <Editor />
//   </EditorColorVariablesProvider>
//
// The variables must be defined in your CSS (`:root { --brand-blue: … }`) so
// the swatches and applied colors resolve.

export {
  EditorColorVariablesProvider,
  useColorVariables,
} from '../editor/colors/EditorColorVariablesProvider'
export type {
  ColorVariable,
  EditorColorVariablesValue,
} from '../editor/colors/EditorColorVariablesProvider'
