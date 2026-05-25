[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / getComponent

# Function: getComponent()

> **getComponent**\<`P`\>(`id`): [`CanonicalComponent`](../interfaces/CanonicalComponent.md)\<`P`\> \| `undefined`

Defined in: registry/registry.ts:127

Look up a canonical by id. Returns `undefined` when the id isn't
registered. Cast via the `P` generic when you need the typed props
shape; defaults to `Record<string, unknown>` if omitted.

## Type Parameters

### P

`P` = `Record`\<`string`, `unknown`\>

## Parameters

### id

`string`

## Returns

[`CanonicalComponent`](../interfaces/CanonicalComponent.md)\<`P`\> \| `undefined`
