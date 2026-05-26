[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / unregisterAdapter

# Function: unregisterAdapter()

> **unregisterAdapter**(`id`): `boolean`

Defined in: adapters/AdapterContext.tsx:44

Remove an adapter by id. Returns `true` if an adapter was removed.
Hosts that want to replace a built-in adapter call this then
`registerAdapter(replacement)` with the same id.

## Parameters

### id

`string`

## Returns

`boolean`
