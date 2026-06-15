import { useEditor, useNode } from '@craftjs/core'
import { Fragment, useEffect, useRef } from 'react'
import { useEditorStore } from '@/state/editorStore'

// Phase 11 § 3.11 — inline text editor primitive.
//
// Wraps a piece of text inside an adapter impl (Text's content,
// Heading's content, Button's label).
//
// Two modes:
//   - Display: returns a Fragment containing `text`. No DOM wrapper,
//     parent typography cascades directly.
//   - Edit: returns a contentEditable span. The DOM is the source of
//     truth during the edit (the user types into the span). On a
//     commit event (Enter for single-line, Escape, click outside,
//     blur), the span's textContent is written to the canonical's
//     prop in a single setProp call — that's one undo step per
//     edit gesture.
//
// Why we DON'T live-commit per keystroke: an earlier iteration did,
// using actions.history.throttle so all keystrokes coalesced into
// one undo step. It looked good but turned out to cause subtle
// re-render ordering issues when combined with the seed effect and
// outside-click listener. Committing once on done is simpler, has
// the same single-undo-step property naturally, and the canvas is
// already showing live feedback via the contentEditable's own DOM
// updates while typing.
//
// The display→edit transition is driven by `editorStore.editingTextNode`.
// The adapter impl is responsible for setting that state on
// double-click (see ShadcnText etc.) and the primitive unsets it
// on commit.

interface EditableTextProps {
  text: string
  /**
   * The key under `data.props.nodeProps` to write on commit. Canonical
   * props live at `data.props.nodeProps[key]` (the
   * `<Element nodeProps={...} />` convention) — writing directly to
   * `data.props[key]` silently misses, which earlier made commits
   * appear to revert to the original.
   */
  propPath: string
  /**
   * When false (default): Enter commits + exits. Shift+Enter is a
   * no-op. Used for Heading and Button labels.
   * When true: Enter / Shift+Enter both insert a newline (matching
   * the user's expectation that Enter doesn't blur a multi-line
   * region). Used for Text.
   */
  multiline?: boolean
}

// Shape of data.props for any CanonicalNode: { nodeProps: {...}, style: {...} }.
// We only touch `.nodeProps` here, but the field name is what matters.
type CanonicalNodeData = { nodeProps: Record<string, unknown> }

export function EditableText({
  text,
  propPath,
  multiline = false,
}: EditableTextProps) {
  const { id } = useNode()
  const { actions } = useEditor()
  const isEditing = useEditorStore((s) => s.editingTextNode === id)
  const setEditingTextNode = useEditorStore((s) => s.setEditingTextNode)

  const spanRef = useRef<HTMLSpanElement | null>(null)
  // Original value captured when edit mode opens; used for Escape.
  const originalRef = useRef(text)
  // True while we're inside a commit, so the outside-click effect
  // doesn't double-fire if its mousedown lands on the same gesture
  // that already committed.
  const committedRef = useRef(false)

  // Latest text in a ref so the effect closures below don't go stale
  // when the prop changes mid-edit.
  const textRef = useRef(text)
  useEffect(() => {
    textRef.current = text
  }, [text])

  // Stable refs to the setters so effect deps stay minimal.
  const actionsRef = useRef(actions)
  actionsRef.current = actions
  const setEditingTextNodeRef = useRef(setEditingTextNode)
  setEditingTextNodeRef.current = setEditingTextNode

  // Open: seed the span text, focus, select-all so the first
  // keystroke replaces.
  useEffect(() => {
    if (!isEditing) return
    committedRef.current = false
    originalRef.current = textRef.current
    const el = spanRef.current
    if (!el) return
    el.textContent = textRef.current
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [isEditing])

  // Commit-on-outside-click. Robust against focus-shift races where
  // blur doesn't fire (Craft connectors preventDefault on mousedown
  // to manage drag init, suppressing the default focus shift).
  // Capture phase so we beat any handler that might stopPropagation.
  //
  // CRITICAL: declared above the early-return below — hook order
  // must match across renders.
  useEffect(() => {
    if (!isEditing) return
    const handler = (e: MouseEvent) => {
      const el = spanRef.current
      if (!el) return
      const target = e.target as Node | null
      if (!target || el.contains(target)) return
      if (committedRef.current) return
      committedRef.current = true
      const value = el.textContent ?? ''
      actionsRef.current.setProp(id, (props: CanonicalNodeData) => {
        props.nodeProps[propPath] = value
      })
      setEditingTextNodeRef.current(null)
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [isEditing, id, propPath])

  if (!isEditing) {
    // Display the text as given. Template `{{ token }}` substitution happens
    // upstream in CanonicalNode (adapter-agnostic, display only) — except for
    // the node being inline-edited, which receives the RAW token here so the
    // user edits the template, not the substituted value.
    if (!multiline || !text.includes('\n')) return <>{text}</>
    const lines = text.split('\n')
    return (
      <>
        {lines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </>
    )
  }

  const commit = () => {
    const el = spanRef.current
    if (!el) return
    if (committedRef.current) return
    committedRef.current = true
    const value = el.textContent ?? ''
    actions.setProp(id, (props: CanonicalNodeData) => {
      props.nodeProps[propPath] = value
    })
    setEditingTextNode(null)
  }

  const cancel = () => {
    if (committedRef.current) return
    committedRef.current = true
    actions.setProp(id, (props: CanonicalNodeData) => {
      props.nodeProps[propPath] = originalRef.current
    })
    setEditingTextNode(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
      return
    }
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      commit()
      return
    }
    // Multiline + Enter (with or without Shift) → default
    // contentEditable behavior inserts a newline.
  }

  // `plaintext-only` makes the browser insert raw "\n" on Enter
  // instead of <br>/<div> wrappers, so textContent reads back the
  // edit faithfully. white-space: pre-wrap on the span makes those
  // "\n"s render as visible line breaks while typing.
  return (
    <span
      ref={spanRef}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={multiline}
      data-craft-editing="true"
      onBlur={commit}
      onKeyDown={handleKeyDown}
      style={multiline ? { whiteSpace: 'pre-wrap' } : undefined}
      // Keep clicks inside the editor from triggering selection on
      // the layer tree's container delegate.
      onMouseDown={(e) => e.stopPropagation()}
    />
  )
}
