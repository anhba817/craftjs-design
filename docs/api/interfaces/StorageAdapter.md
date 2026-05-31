[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / StorageAdapter

# Interface: StorageAdapter

Defined in: persistence/types.ts:61

## Methods

### deleteDocument()

> **deleteDocument**(`id`): `Promise`\<`void`\>

Defined in: persistence/types.ts:72

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### estimateUsage()

> **estimateUsage**(): `Promise`\<[`StorageUsage`](StorageUsage.md)\>

Defined in: persistence/types.ts:74

#### Returns

`Promise`\<[`StorageUsage`](StorageUsage.md)\>

***

### init()?

> `optional` **init**(): `Promise`\<`void`\>

Defined in: persistence/types.ts:65

#### Returns

`Promise`\<`void`\>

***

### listVersions()?

> `optional` **listVersions**(`id`): `Promise`\<[`DocumentVersion`](DocumentVersion.md)[]\>

Defined in: persistence/types.ts:77

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`DocumentVersion`](DocumentVersion.md)[]\>

***

### readDocument()

> **readDocument**(`id`): `Promise`\<\{ `adapterId`: `string`; `colorMode?`: `"light"` \| `"dark"` \| `"system"`; `craftJson`: `string`; `themeId?`: `string`; `version`: `number`; \} \| `null`\>

Defined in: persistence/types.ts:70

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `adapterId`: `string`; `colorMode?`: `"light"` \| `"dark"` \| `"system"`; `craftJson`: `string`; `themeId?`: `string`; `version`: `number`; \} \| `null`\>

***

### readIndex()

> **readIndex**(): `Promise`\<[`DocumentIndex`](DocumentIndex.md)\>

Defined in: persistence/types.ts:67

#### Returns

`Promise`\<[`DocumentIndex`](DocumentIndex.md)\>

***

### readVersion()?

> `optional` **readVersion**(`id`, `versionId`): `Promise`\<\{ `adapterId`: `string`; `colorMode?`: `"light"` \| `"dark"` \| `"system"`; `craftJson`: `string`; `themeId?`: `string`; `version`: `number`; \} \| `null`\>

Defined in: persistence/types.ts:78

#### Parameters

##### id

`string`

##### versionId

`string`

#### Returns

`Promise`\<\{ `adapterId`: `string`; `colorMode?`: `"light"` \| `"dark"` \| `"system"`; `craftJson`: `string`; `themeId?`: `string`; `version`: `number`; \} \| `null`\>

***

### writeDocument()

> **writeDocument**(`id`, `doc`): `Promise`\<[`WriteResult`](../type-aliases/WriteResult.md)\>

Defined in: persistence/types.ts:71

#### Parameters

##### id

`string`

##### doc

###### adapterId

`string` = `...`

###### colorMode?

`"light"` \| `"dark"` \| `"system"` = `...`

###### craftJson

`string` = `...`

###### themeId?

`string` = `...`

###### version

`number` = `...`

#### Returns

`Promise`\<[`WriteResult`](../type-aliases/WriteResult.md)\>

***

### writeIndex()

> **writeIndex**(`index`): `Promise`\<[`WriteResult`](../type-aliases/WriteResult.md)\>

Defined in: persistence/types.ts:68

#### Parameters

##### index

[`DocumentIndex`](DocumentIndex.md)

#### Returns

`Promise`\<[`WriteResult`](../type-aliases/WriteResult.md)\>

***

### writeVersion()?

> `optional` **writeVersion**(`id`, `doc`, `meta`): `Promise`\<[`WriteResult`](../type-aliases/WriteResult.md)\>

Defined in: persistence/types.ts:79

#### Parameters

##### id

`string`

##### doc

###### adapterId

`string` = `...`

###### colorMode?

`"light"` \| `"dark"` \| `"system"` = `...`

###### craftJson

`string` = `...`

###### themeId?

`string` = `...`

###### version

`number` = `...`

##### meta

###### kind

`"auto"` \| `"manual"`

###### label?

`string`

#### Returns

`Promise`\<[`WriteResult`](../type-aliases/WriteResult.md)\>
