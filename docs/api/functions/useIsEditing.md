[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / useIsEditing

# Function: useIsEditing()

> **useIsEditing**(): `boolean`

Defined in: editor/canvas/useIsEditing.ts:6

Phase 13 § 5.3 — true when the editor is in editing mode (Craft's
`state.options.enabled`). Overlay-style canonicals (Modal / Drawer /
Toast / Tooltip / Popover) read this to branch their render:

  - editing → render inline + always open so the content is a normal
    drop target the designer can drop into;
  - runtime / preview → render the real overlay (Dialog, Sheet, Toast,
    etc.) with the library's own open / hover / hide behavior.

Custom overlay canonicals added by SDK consumers should follow the same
contract for visual consistency with the built-ins.

## Returns

`boolean`

## Example

```ts
import { useIsEditing } from '@crafted-design/editor/sdk'

  function MyOverlay({ children }) {
    return useIsEditing()
      ? <div className="inline-preview">{children}</div>
      : <RealOverlayPrimitive>{children}</RealOverlayPrimitive>
  }
```
