[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / tabSlotKeys

# Function: tabSlotKeys()

> **tabSlotKeys**(`tabs`): `string`[]

Defined in: registry/components/tabs.ts:50

Resolves the slot key for each tab. Phase 10 uses `tab.id` as the
source of truth — stable across `value` renames. The fallback to
`uniqueTabValues(tabs)[index]` covers (a) documents that somehow
escaped the migration with id-less tabs, and (b) defensive coding
in case a future hand-edit drops the field.

Returned in input order; same length as `tabs`.

## Parameters

### tabs

readonly `object`[]

## Returns

`string`[]
