[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / useNodeClassesMulti

# Function: useNodeClassesMulti()

> **useNodeClassesMulti**(`nodeIds`, `slot?`): `object`

Defined in: editor/inspector/shared/useNodeClassesMulti.ts:37

Multi-node variant of [useNodeClasses](useNodeClasses.md). Returns per-node
classStrings + inlineStyles arrays in the order of `nodeIds`, plus
write helpers that fan out to every node atomically (one undo step).

Used by the Inspector's style panels when the user multi-selects
nodes. Single-node consumers should keep using
[useNodeClasses](useNodeClasses.md) — it's a thin wrapper over this hook for the
common case.

Mixed-value detection lives in the panel (callers compare the
returned arrays element-wise). The hook itself doesn't merge; that
decision needs the panel's parser to know which "group" a class
belongs to (e.g. `p-4 m-2` vs `m-2 p-4` should be considered
equal for spacing). Panels typically:

  const tokens = classStrings.map(cs => parseFoo(cs).slice[key])
  const isMixed = tokens.some(t => t !== tokens[0])

Writes coalesce via Craft's history throttle: calling
writeClassesAll within ~500ms registers one undo entry even though
it dispatches N setProp actions.

## Parameters

### nodeIds

readonly `string`[]

### slot?

`string` = `'root'`

## Returns

### activeBreakpoint

> **activeBreakpoint**: [`Breakpoint`](../type-aliases/Breakpoint.md)

### classStrings

> **classStrings**: `string`[]

### inlineStyles

> **inlineStyles**: `Record`\<`string`, `string`\>[]

### writeClassesAll

> **writeClassesAll**: (`transform`) => `void`

Compute a new class string for each node from its current one,
then write atomically via a single throttled history rate so
the multi-node edit is one undo step. The transform receives
each node's CURRENT class string (so it can preserve unrelated
tokens) and returns the next string.

#### Parameters

##### transform

(`current`) => `string`

#### Returns

`void`

### writeInlineAll

> **writeInlineAll**: (`cssProperty`, `value`) => `void`

Write the same inline value to every selected node's slot. Same
throttle-coalescing as writeClassesAll → one undo step.

#### Parameters

##### cssProperty

`string`

##### value

`string` \| `undefined`

#### Returns

`void`

### writeInlineFn

> **writeInlineFn**: (`cssProperty`, `computeNext`) => `void`

Phase 12 — per-node inline write. Unlike writeInlineAll (same
value to every node), this reads EACH node's current value for
`cssProperty` and computes its next value via `computeNext`. Used
by the Transforms / Filters panels, where the property is a
composed function list (`transform`, `filter`) and setting one
function must preserve each node's other functions independently.

#### Parameters

##### cssProperty

`string`

##### computeNext

(`current`) => `string`

#### Returns

`void`
