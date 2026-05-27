import { createContext, useContext, useMemo, type ReactNode } from 'react'

// Phase 12 § 4.9 — host-supplied CSS custom properties surfaced as a color
// source in the ColorPicker, alongside the shadcn theme tokens. Mirrors the
// EditorImageProvider shape: a context with an empty default (no variables),
// a Provider component for hosts to wrap the editor, and a hook the picker
// reads. Picking a variable writes `var(--name)` to the slot, so it tracks
// the host's stylesheet at runtime (theme swaps, dark mode, etc.).

export interface ColorVariable {
  // The CSS custom-property name WITHOUT the leading `--` (e.g. 'brand-blue').
  // A leading `--` passed by the host is tolerated and stripped.
  name: string
  // Optional display label; defaults to `--{name}` in the UI.
  label?: string
}

export interface EditorColorVariablesValue {
  variables: ColorVariable[]
}

const EMPTY: EditorColorVariablesValue = { variables: [] }

const EditorColorVariablesContext =
  createContext<EditorColorVariablesValue>(EMPTY)

export function EditorColorVariablesProvider({
  variables,
  children,
}: {
  variables: ColorVariable[]
  children: ReactNode
}) {
  const resolved = useMemo<EditorColorVariablesValue>(
    () => ({
      variables: variables.map((v) => ({
        name: v.name.replace(/^--/, ''),
        label: v.label,
      })),
    }),
    [variables],
  )
  return (
    <EditorColorVariablesContext.Provider value={resolved}>
      {children}
    </EditorColorVariablesContext.Provider>
  )
}

export function useColorVariables(): EditorColorVariablesValue {
  return useContext(EditorColorVariablesContext)
}
