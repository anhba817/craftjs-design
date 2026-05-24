// Side-effect imports — each template module calls registerTemplate at load.
// Order doesn't matter for templates; the picker UI in Group E sorts by name.
import './empty'
import './landing-page'
import './form'

// Re-export the public surface so consumers can read the registry.
export { getTemplate, listTemplates, type TemplateDefinition } from './registry'
