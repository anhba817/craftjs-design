[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / getComponentByDisplayName

# Function: getComponentByDisplayName()

> **getComponentByDisplayName**(`displayName`): [`CanonicalComponent`](../interfaces/CanonicalComponent.md)\<`any`\> \| `undefined`

Defined in: registry/registry.ts:139

Reverse-lookup helper. Inspector panels and Craft.js know nodes by
their `displayName` (each canonical's displayName is also its Craft
user-component name — see `src/craft/resolver.tsx`). This is the
one path back to the canonical def.

## Parameters

### displayName

`string`

## Returns

[`CanonicalComponent`](../interfaces/CanonicalComponent.md)\<`any`\> \| `undefined`
