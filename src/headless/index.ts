// Phase 21 — `@crafted-design/editor/headless`: build, edit, validate, and
// introspect editor documents WITHOUT React, a DOM, or the Craft runtime.
// This is the foundation the MCP server drives; hosts can also use it
// directly (server-side document generation, migrations, batch tooling).
//
// Unlike `/sdk` (side-effect-free by contract), this entry REGISTERS the
// built-in canonicals, themes, and templates on import — the builder needs
// the canonical registry populated. It deliberately registers NO adapters:
// building documents is adapter-independent (documents are canonical-id
// based; an adapter is only needed to RENDER).
import '@/registry/components'
import '@/themes'
import '@/persistence/templates'

export {
  buildDocument,
  slotKeysFor,
  type BuildDocumentOptions,
  type HeadlessNodeSpec,
  type SerializedCraftNode,
  type SerializedNodeMap,
} from './build'
export {
  addNode,
  canonicalIdOf,
  moveNode,
  removeNode,
  updateNodeProps,
  updateNodeStyle,
  type AddNodeOptions,
  type MoveNodeOptions,
} from './edit'
export {
  describeCanonical,
  describeCanonicals,
  type CanonicalDescription,
} from './introspect'
export {
  validateDocument,
  type DocumentIssue,
  type ValidationResult,
} from './validate'

// The envelope + import/registry seams headless consumers also need.
export { parseDocumentJson } from '@/persistence/importDocument'
export type { EditorDocument } from '@/persistence/schema'
export { getComponent, listComponents } from '@/registry/registry'
export { getTheme, listThemes } from '@/themes/registry'
export { getTemplate, listTemplates } from '@/persistence/templates/registry'
