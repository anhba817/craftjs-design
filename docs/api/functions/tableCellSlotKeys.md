[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / tableCellSlotKeys

# Function: tableCellSlotKeys()

> **tableCellSlotKeys**(`rows`, `cols`, `merges?`): `string`[]

Defined in: registry/components/dynamic-slots.ts:137

Slot list in row-major order, omitting cells covered by a merge (those have
no slot — the merge's top-left owns the content).

## Parameters

### rows

`number`

### cols

`number`

### merges?

readonly `object`[] = `[]`

## Returns

`string`[]
