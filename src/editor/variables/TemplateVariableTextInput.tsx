import { useRef } from 'react'
import { useTemplateVariables } from './EditorTemplateVariablesProvider'
import { TemplateVariablePicker } from './TemplateVariablePicker'

// Phase 26 (Group C) — the inspector's string input, augmented with the `{{ }}`
// variable picker. When the host declared template variables, a picker button
// sits beside the input; selecting a variable inserts `{{ key }}` at the
// caret (the user can also just type the token). With no variables declared it
// renders the plain input — byte-identical to before the feature.

export function TemplateVariableTextInput({
  value,
  onChange,
}: {
  value: unknown
  onChange: (v: unknown) => void
}) {
  const variables = useTemplateVariables()
  const text = (value as string | undefined) ?? ''
  const inputRef = useRef<HTMLInputElement>(null)
  // Last-known caret — captured continuously so it survives the input losing
  // focus when the user clicks the picker button.
  const caret = useRef({ start: text.length, end: text.length })

  const rememberCaret = () => {
    const el = inputRef.current
    if (el)
      caret.current = {
        start: el.selectionStart ?? text.length,
        end: el.selectionEnd ?? text.length,
      }
  }

  const insert = (key: string) => {
    const token = `{{ ${key} }}`
    const { start, end } = caret.current
    const next = text.slice(0, start) + token + text.slice(end)
    onChange(next)
    // Restore focus + place the caret after the inserted token (post-render).
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      const pos = start + token.length
      el.focus()
      el.setSelectionRange(pos, pos)
      caret.current = { start: pos, end: pos }
    })
  }

  const input = (
    <input
      ref={inputRef}
      type="text"
      value={text}
      onChange={(e) => onChange(e.target.value)}
      onSelect={rememberCaret}
      onKeyUp={rememberCaret}
      onMouseUp={rememberCaret}
      onBlur={rememberCaret}
      className="w-full rounded border border-ed-border-2 bg-ed-surface px-1.5 py-1 text-sm text-ed-text"
    />
  )

  if (variables.length === 0) return input

  return (
    <div className="flex items-center gap-1">
      {input}
      <TemplateVariablePicker onPick={insert} />
    </div>
  )
}
