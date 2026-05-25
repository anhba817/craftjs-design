[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / useNodeClasses

# Function: useNodeClasses()

> **useNodeClasses**(`nodeId`, `slot?`): `object`

Defined in: editor/inspector/shared/useNodeClasses.ts:49

The single I/O funnel for class-string + arbitrary-inline editing on
a canvas node's style slot. Read the current class string + inline
style record; write either via `writeClasses(next)` or
`writeInline(cssProp, value)`.

Routes reads / writes between the **base** breakpoint
(`style.classes` / `style.inline`) and **non-base** breakpoints
(`style.responsive` / `style.responsiveInline`) based on
`editorStore.activeBreakpoint`. Panel authors should call this hook
rather than poking Craft state directly — it captures the conventions
the built-in panels rely on (responsive bucket routing, container peel
on clear, etc.).

The returned `classString` / `inlineStyle` always reflect the LIVE
`activeBreakpoint` — they're computed in the hook body, not in the
Craft collector, so breakpoint changes don't read stale data.

## Parameters

### nodeId

`string`

Craft node id (e.g., from `useEditor` collector).

### slot?

`string` = `'root'`

Style slot. `'root'` for Pattern A canonicals; named
  slot (`'header'`, `'body'`, …) for Pattern B canonicals like Card.
  Defaults to `'root'`.

## Returns

`object`

`{ classString, inlineStyle, writeClasses, writeInline,
  activeBreakpoint }`. `writeClasses(next)` replaces the slot's class
  string; `writeInline(prop, value)` sets a single CSS property (or
  clears it with `undefined`).

### activeBreakpoint

> **activeBreakpoint**: [`Breakpoint`](../type-aliases/Breakpoint.md)

### classString

> **classString**: `string`

### inlineStyle

> **inlineStyle**: `Record`\<`string`, `string`\>

### writeClasses

> **writeClasses**: (`next`) => `void`

#### Parameters

##### next

`string`

#### Returns

`void`

### writeInline

> **writeInline**: (`cssProperty`, `value`) => `void`

#### Parameters

##### cssProperty

`string`

##### value

`string` \| `undefined`

#### Returns

`void`

## Example

```tsx
import { useNodeClasses } from '@crafted-design/editor/sdk'

function MyPanel({ nodeId, slot = 'root' }: { nodeId: string; slot?: string }) {
  const { classString, writeClasses } = useNodeClasses(nodeId, slot)
  return (
    <textarea
      value={classString}
      onChange={(e) => writeClasses(e.target.value)}
    />
  )
}
```
