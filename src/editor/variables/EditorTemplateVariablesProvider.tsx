import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { lookupValue, type TemplateValues } from '@/headless/interpolate'
import { TemplateValuesProvider } from './templateValues'

// Phase 26 — host-supplied template variables. Wrap the editor to (a) populate
// the `{{ }}` insert picker with the host's variable list and (b) feed the
// canvas preview with live values (host `values` ?? each variable's `sample`).
// Mirrors EditorColorVariablesProvider. The document stores only the
// `{{ token }}`; values here are design-time preview only (production values
// are passed to <DocumentRenderer variables> / renderDocumentToHtml).

export interface TemplateVariable {
  /** Dot-path key referenced as `{{ key }}` (e.g. 'contact.name'). */
  key: string
  /** Display label for the picker; defaults to `key`. */
  label?: string
  /** Optional grouping for the picker. */
  group?: string
  /** Representative value shown on the canvas when no live value is supplied. */
  sample?: string
}

const TemplateVariablesContext = createContext<TemplateVariable[]>([])

export function EditorTemplateVariablesProvider({
  variables,
  values,
  children,
}: {
  variables: TemplateVariable[]
  /**
   * Optional live values for the editor canvas. A token resolves to
   * `values[key] ?? variable.sample ?? the raw {{ token }}`. Accepts a flat
   * map (`{'contact.name': 'Jane'}`) or a nested object (`{contact:{name}}`).
   */
  values?: TemplateValues
  children: ReactNode
}) {
  // Resolved preview map, flat-keyed by each declared variable: live value
  // (looked up flat OR nested) falling back to the sample.
  const resolved = useMemo<TemplateValues>(() => {
    const out: TemplateValues = {}
    for (const v of variables) {
      const live = values ? lookupValue(values, v.key) : undefined
      if (live !== undefined && live !== null) out[v.key] = live
      else if (v.sample !== undefined) out[v.key] = v.sample
    }
    return out
  }, [variables, values])

  return (
    <TemplateVariablesContext.Provider value={variables}>
      <TemplateValuesProvider values={resolved}>
        {children}
      </TemplateValuesProvider>
    </TemplateVariablesContext.Provider>
  )
}

/** The host's declared variables (drives the `{{ }}` insert picker). */
export function useTemplateVariables(): TemplateVariable[] {
  return useContext(TemplateVariablesContext)
}
