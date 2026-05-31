[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / EditorImageProviderValue

# Interface: EditorImageProviderValue

Defined in: editor/assets/EditorImageProvider.tsx:26

## Properties

### canList

> **canList**: `boolean`

Defined in: editor/assets/EditorImageProvider.tsx:48

Whether `list()` returns meaningful results. Drives whether the
AssetLibraryPanel renders and whether the picker shows a real
library tab vs the document-scan fallback.

***

### delete?

> `optional` **delete?**: (`url`) => `Promise`\<`void`\>

Defined in: editor/assets/EditorImageProvider.tsx:42

Optional removal. Hosts that support it expose a delete button.

#### Parameters

##### url

`string`

#### Returns

`Promise`\<`void`\>

***

### list

> **list**: () => `Promise`\<[`EditorImageAsset`](EditorImageAsset.md)[]\>

Defined in: editor/assets/EditorImageProvider.tsx:40

Previously-uploaded assets for the library grid. The default
provider can't enumerate inline data URLs, so it returns [] and
sets `canList: false` — the AssetLibraryPanel hides itself and
the ImagePicker's Library tab falls back to scanning the current
document's Image nodes.

#### Returns

`Promise`\<[`EditorImageAsset`](EditorImageAsset.md)[]\>

***

### upload

> **upload**: (`file`) => `Promise`\<[`EditorImageAsset`](EditorImageAsset.md)\>

Defined in: editor/assets/EditorImageProvider.tsx:32

Persist a file and resolve to its canonical URL. The default
provider returns a data: URL; a host provider returns a hosted
URL.

#### Parameters

##### file

`File`

#### Returns

`Promise`\<[`EditorImageAsset`](EditorImageAsset.md)\>
