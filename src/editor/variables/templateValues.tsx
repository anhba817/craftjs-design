import { createContext, useContext, type ReactNode } from 'react'
import type { TemplateValues } from '@/headless/interpolate'

// Phase 26 — the resolved key→value map the canvas/renderer substitute against.
// Fed by EditorTemplateVariablesProvider (editor: host value ?? sample) and by
// <DocumentRenderer variables> (renderer: the host's real values). EditableText
// reads it in display mode. Internal plumbing — the public seam is
// EditorTemplateVariablesProvider; built-in adapters get substitution for free
// via the shared EditableText.

const EMPTY: TemplateValues = {}

const TemplateValuesContext = createContext<TemplateValues>(EMPTY)

export function TemplateValuesProvider({
  values,
  children,
}: {
  values: TemplateValues
  children: ReactNode
}) {
  return (
    <TemplateValuesContext.Provider value={values}>
      {children}
    </TemplateValuesContext.Provider>
  )
}

export function useTemplateValues(): TemplateValues {
  return useContext(TemplateValuesContext)
}
