// Phase 26 — template-variable interpolation. A safe `{{ path }}` substitution
// (a subset valid as Jinja/Mustache/Liquid for the interpolation case) — NO
// control flow, filters, or expressions. Pure, no React/DOM, so the editor
// preview, <DocumentRenderer>, renderDocumentToHtml, and the MCP outline all
// share it.

export type TemplateValues = Record<string, unknown>

export interface InterpolateOptions {
  /**
   * What to do when a `{{ token }}` has no value:
   *   - 'keep'  (default) — leave the literal `{{ token }}` (visibly unbound).
   *   - 'blank' — replace with the empty string.
   */
  onMissing?: 'keep' | 'blank'
}

// A token: `{{ path.to.var }}`, whitespace-tolerant. The path allows word
// chars, dots (nesting), `-`, and `$`. Anything else (filters, `{% %}`,
// expressions) is NOT matched and is left untouched.
const TOKEN = /\{\{\s*([\w$.-]+)\s*\}\}/g

/**
 * Resolve a dot-path against a values map. Tries the FLAT key first
 * (`values['contact.name']`), then walks the nested object
 * (`values.contact.name`) — so a host can pass either shape. Returns
 * `undefined` when unresolved.
 */
export function lookupValue(values: TemplateValues, path: string): unknown {
  if (Object.prototype.hasOwnProperty.call(values, path)) return values[path]
  let cur: unknown = values
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

/** Replace `{{ path }}` tokens in `template` with values (text, never HTML). */
export function interpolate(
  template: string,
  values: TemplateValues,
  opts: InterpolateOptions = {},
): string {
  if (!template || !template.includes('{{')) return template
  const onMissing = opts.onMissing ?? 'keep'
  return template.replace(TOKEN, (raw, path: string) => {
    const v = lookupValue(values, path)
    if (v === undefined || v === null) return onMissing === 'blank' ? '' : raw
    return String(v)
  })
}

/** The distinct variable keys a string references (e.g. for validation/UI). */
export function extractTemplateRefs(template: string): string[] {
  if (!template || !template.includes('{{')) return []
  const refs = new Set<string>()
  for (const m of template.matchAll(TOKEN)) refs.add(m[1])
  return [...refs]
}
