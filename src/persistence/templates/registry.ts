import type { EditorDocument } from '../schema'

// Phase 7 starter templates. Each template is an EditorDocument envelope plus
// some lightweight metadata for the picker UI (Group E). Templates register
// themselves at module load via side-effect imports in this directory's
// index.ts.
//
// The envelope's craftJson is constructed via ./builder rather than hand-typed
// — keeps templates type-checked against the canonical registry and avoids
// silent drift when a canonical's prop schema changes.

/** A starter document the user can pick from the New-from-template menu. */
export interface TemplateDefinition {
  /** Stable identifier. Used as the dedupe key + the picker's React key. */
  id: string
  /** Display name shown in the picker. */
  name: string
  /** One-line description shown under the name. */
  description: string
  /** The actual document envelope inserted when the user picks this template. */
  envelope: EditorDocument
}

const templates = new Map<string, TemplateDefinition>()

// Phase 10 § 2.10 — hot-reload subscription. Same pattern as the
// font-token, adapter, and theme registries. Version increments on
// every register / unregister; TemplatePicker subscribes via
// useSyncExternalStore so post-mount registerTemplate() calls update
// the picker without forcing the user to close + reopen the popover.
let registryVersion = 0
const registryListeners = new Set<() => void>()

/**
 * Monotonically-increasing counter incremented on every template
 * registry mutation. Consumed via `useSyncExternalStore` by
 * TemplatePicker so post-mount registrations surface immediately.
 */
export function getTemplateRegistryVersion(): number {
  return registryVersion
}

/** Subscribe to template-registry version bumps. Returns an unsubscribe function. */
export function subscribeTemplateRegistry(cb: () => void): () => void {
  registryListeners.add(cb)
  return () => {
    registryListeners.delete(cb)
  }
}

function bumpTemplateRegistry(): void {
  registryVersion += 1
  for (const cb of registryListeners) cb()
}

/**
 * Register a starter template. Throws on duplicate id; call
 * `unregisterTemplate(id)` first to replace a built-in. Mutating the
 * registry bumps the version counter so the TemplatePicker reflects
 * the change.
 */
export function registerTemplate(def: TemplateDefinition): void {
  if (templates.has(def.id)) {
    throw new Error(`duplicate template id: ${def.id}`)
  }
  templates.set(def.id, def)
  bumpTemplateRegistry()
}

/**
 * Remove a template by id. Returns `true` if a template was removed,
 * `false` if the id wasn't registered.
 */
export function unregisterTemplate(id: string): boolean {
  const had = templates.delete(id)
  if (had) bumpTemplateRegistry()
  return had
}

/** Look up a template by id; returns `undefined` if not registered. */
export function getTemplate(id: string): TemplateDefinition | undefined {
  return templates.get(id)
}

/** All registered templates, in registration order. */
export function listTemplates(): TemplateDefinition[] {
  return [...templates.values()]
}

/** @internal Test-only — clears the in-memory registry between cases. */
export function _clearTemplatesForTest(): void {
  templates.clear()
}
