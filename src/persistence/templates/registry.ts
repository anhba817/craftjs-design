import type { EditorDocument } from '../schema'

// Phase 7 starter templates. Each template is an EditorDocument envelope plus
// some lightweight metadata for the picker UI (Group E). Templates register
// themselves at module load via side-effect imports in this directory's
// index.ts.
//
// The envelope's craftJson is constructed via ./builder rather than hand-typed
// — keeps templates type-checked against the canonical registry and avoids
// silent drift when a canonical's prop schema changes.

export interface TemplateDefinition {
  id: string
  name: string
  description: string
  envelope: EditorDocument
}

const templates = new Map<string, TemplateDefinition>()

export function registerTemplate(def: TemplateDefinition): void {
  if (templates.has(def.id)) {
    throw new Error(`duplicate template id: ${def.id}`)
  }
  templates.set(def.id, def)
}

export function getTemplate(id: string): TemplateDefinition | undefined {
  return templates.get(id)
}

export function listTemplates(): TemplateDefinition[] {
  return [...templates.values()]
}

/** @internal Test-only — clears the in-memory registry between cases. */
export function _clearTemplatesForTest(): void {
  templates.clear()
}
