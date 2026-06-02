[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / slideSlotKeys

# Function: slideSlotKeys()

> **slideSlotKeys**(`slides`): `string`[]

Defined in: registry/components/dynamic-slots.ts:73

Resolves the slot key for each slide. Same shape as `tabSlotKeys`.
Double-prefixed (`slide-slide-${id}`) is intentional — `id` already starts
with `slide-` from genSlideId, and ALL slot keys share the SLIDE_SLOT_PREFIX
so the registry / serializer can recognise them.

## Parameters

### slides

readonly `object`[]

## Returns

`string`[]
