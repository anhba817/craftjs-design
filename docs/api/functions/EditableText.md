[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / EditableText

# Function: EditableText()

> **EditableText**(`__namedParameters`): `Element`

Defined in: editor/text-edit/EditableText.tsx:58

Phase 11 § 3.11 — inline text-edit primitive for adapter impls.

Renders text in two modes: (a) display = a React Fragment, no
extra DOM wrapper, parent's typography applies directly; (b) edit
= a `contentEditable` span that commits keystrokes via throttled
setProp so the entire edit gesture coalesces into one undo step.

Adapter impls put `<EditableText text={content} propPath="content" />`
inside their root element and wire `onDoubleClick` on the root to
`useStartTextEdit()` to enter edit mode.

## Parameters

### \_\_namedParameters

`EditableTextProps`

## Returns

`Element`

## Example

```tsx
import { EditableText, useStartTextEdit } from '@design/sdk'

function MyText({ props, rootRef }: AdapterRenderProps) {
  const { content } = props as { content: string }
  const startEdit = useStartTextEdit()
  return (
    <p ref={rootRef} onDoubleClick={(e) => { e.stopPropagation(); startEdit() }}>
      <EditableText text={content} propPath="content" multiline />
    </p>
  )
}
```
