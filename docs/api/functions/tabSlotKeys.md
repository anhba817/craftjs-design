[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / tabSlotKeys

# Function: tabSlotKeys()

> **tabSlotKeys**(`tabs`): `string`[]

Defined in: registry/components/dynamic-slots.ts:60

Resolves the slot key for each tab. Uses `tab.id` as the source of truth
(stable across `value` renames), falling back to `uniqueTabValues(tabs)[i]`
for id-less tabs. Returned in input order; same length as `tabs`.

## Parameters

### tabs

readonly `object`[]

## Returns

`string`[]
