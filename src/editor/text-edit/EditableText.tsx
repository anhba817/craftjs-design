import { useNode } from '@craftjs/core'
import { useEffect, useRef } from 'react'
import { useThrottledHistory } from '@/editor/history/useThrottledHistory'
import { useEditorStore } from '@/state/editorStore'

// Phase 11 § 3.11 — inline text editor primitive.
//
// Wraps a piece of text inside an adapter impl (Text's content,
// Heading's content, Button's label). Two modes:
//
//   - Display: renders the text as a Fragment (no extra DOM wrapper).
//     The parent element keeps full control of layout / typography.
//   - Edit: renders a contentEditable span. Live input commits via
//     throttled setProp so all keystrokes within the gesture coalesce
//     into one undo step. Enter commits + blurs (or inserts a newline
//     when multiline is true via Shift+Enter / Enter-on-text). Escape
//     reverts to the value held when edit-mode opened.
//
// The display→edit transition is driven by `editorStore.editingTextNode`.
// The adapter impl is responsible for setting this state on
// double-click (see ShadcnText etc.) and unsetting on blur. This
// primitive only consumes it.

interface EditableTextProps {
  /** The text to display when not in edit mode. */
  text: string
  /** The Craft node prop key to update on each keystroke + on blur. */
  propPath: string
  /**
   * When true: Enter inserts a newline, Shift+Enter also inserts a
   * newline (matches the user's expectation that Enter never blurs
   * inside a multi-line text region). When false: Enter blurs (commits)
   * and Shift+Enter is a no-op.
   */
  multiline?: boolean
  /**
   * Extra className for the contentEditable span. The parent's text
   * styles cascade down so usually the span needs nothing — only set
   * this if the parent's layout/box-model needs adjustment in edit
   * mode (rare).
   */
  editClassName?: string
}

export function EditableText({
  text,
  propPath,
  multiline = false,
  editClassName,
}: EditableTextProps) {
  // useNode is safe here — EditableText only ever renders inside a
  // CanonicalNode subtree (the adapter impls that import it are
  // themselves rendered by CanonicalNode).
  const { id } = useNode()
  const isEditing = useEditorStore(
    (s) => s.editingTextNode === id,
  )
  const setEditingTextNode = useEditorStore((s) => s.setEditingTextNode)
  const { setProp } = useThrottledHistory()

  const spanRef = useRef<HTMLSpanElement | null>(null)
  // The value the editor opened with — used to revert on Escape.
  // Captured once per edit session via a ref so subsequent keystrokes
  // don't overwrite it.
  const originalRef = useRef<string>(text)

  // When edit mode opens, capture the original, seed the span's text,
  // and focus + select-all so the user can immediately type to
  // replace.
  useEffect(() => {
    if (!isEditing) return
    originalRef.current = text
    const el = spanRef.current
    if (!el) return
    el.textContent = text
    el.focus()
    // Select-all the existing content so the first keystroke replaces.
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    // Intentionally only depends on isEditing — the text prop can
    // change WHILE editing (our own commits update it) but we don't
    // want to overwrite the user's mid-edit content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  if (!isEditing) {
    return <>{text}</>
  }

  const commitFromDom = () => {
    const el = spanRef.current
    if (!el) return
    const value = el.textContent ?? ''
    setProp(id, (props: Record<string, unknown>) => {
      props[propPath] = value
    })
  }

  const handleInput = () => {
    commitFromDom()
  }

  const handleBlur = () => {
    commitFromDom()
    setEditingTextNode(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      // Revert to original — both in the prop AND in the DOM (the
      // contentEditable's text needs to match the prop, otherwise the
      // next render shows stale text).
      const el = spanRef.current
      if (el) el.textContent = originalRef.current
      setProp(id, (props: Record<string, unknown>) => {
        props[propPath] = originalRef.current
      })
      setEditingTextNode(null)
      return
    }
    if (e.key === 'Enter' && !multiline) {
      // Single-line: Enter blurs to commit. Shift+Enter is a no-op
      // (don't insert newlines into a Heading/Button label).
      e.preventDefault()
      spanRef.current?.blur()
      return
    }
    // For multiline + Enter (with or without Shift), or other keys,
    // let the default contentEditable behavior run.
  }

  return (
    <span
      ref={spanRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={multiline}
      data-craft-editing="true"
      className={editClassName}
      onInput={handleInput}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      // Prevent the layer tree's container delegate from interpreting
      // mousedowns inside the editor as row selection.
      onMouseDown={(e) => e.stopPropagation()}
    />
  )
}
