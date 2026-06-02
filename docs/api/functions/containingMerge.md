[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / containingMerge

# Function: containingMerge()

> **containingMerge**(`r`, `c`, `merges`, `rows`, `cols`): \{ `col`: `number`; `colSpan`: `number`; `row`: `number`; `rowSpan`: `number`; \} \| `null`

Defined in: registry/components/dynamic-slots.ts:102

The merge that contains (r, c), ignoring out-of-bounds merges. Used by both
the canvasSlots generator and the adapter render so slot ids and DOM cells
can't disagree.

## Parameters

### r

`number`

### c

`number`

### merges

readonly `object`[]

### rows

`number`

### cols

`number`

## Returns

\{ `col`: `number`; `colSpan`: `number`; `row`: `number`; `rowSpan`: `number`; \} \| `null`
