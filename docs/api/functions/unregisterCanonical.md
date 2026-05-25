[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / unregisterCanonical

# Function: unregisterCanonical()

> **unregisterCanonical**(`id`): `boolean`

Defined in: registry/registry.ts:116

Remove a canonical from the registry. Used by SDK consumers that want to
replace a built-in (call unregisterCanonical first, then registerCanonical
with the same id). Returns true if a canonical was removed.

## Parameters

### id

`string`

## Returns

`boolean`
