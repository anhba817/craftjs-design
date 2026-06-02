[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / Adapter

# Interface: Adapter

Defined in: adapters/types.ts:57

## Properties

### classMap?

> `optional` **classMap?**: [`ClassMapFn`](../type-aliases/ClassMapFn.md)

Defined in: adapters/types.ts:86

***

### components

> **components**: `Partial`\<`Record`\<[`CanonicalId`](../type-aliases/CanonicalId.md), `ComponentType`\<[`AdapterRenderProps`](AdapterRenderProps.md)\>\>\>

Defined in: adapters/types.ts:60

***

### displayName

> **displayName**: `string`

Defined in: adapters/types.ts:59

***

### id

> **id**: `string`

Defined in: adapters/types.ts:58

***

### mount?

> `optional` **mount?**: () => `void`

Defined in: adapters/types.ts:91

#### Returns

`void`

***

### peerDependencies?

> `optional` **peerDependencies?**: `Record`\<`string`, `string`\>

Defined in: adapters/types.ts:103

***

### themeTokens?

> `optional` **themeTokens?**: `Record`\<`string`, `string`\>

Defined in: adapters/types.ts:81

***

### unmount?

> `optional` **unmount?**: () => `void`

Defined in: adapters/types.ts:92

#### Returns

`void`

***

### Wrapper?

> `optional` **Wrapper?**: `ComponentType`\<\{ `children`: `ReactNode`; \}\>

Defined in: adapters/types.ts:75
