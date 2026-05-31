[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / CanonicalComponent

# Interface: CanonicalComponent\<Props\>

Defined in: registry/types.ts:70

## Type Parameters

### Props

`Props` = `Record`\<`string`, `unknown`\>

## Properties

### applicablePanels?

> `optional` **applicablePanels?**: readonly [`PanelId`](../type-aliases/PanelId.md)[]

Defined in: registry/types.ts:101

***

### canResize?

> `optional` **canResize?**: `boolean`

Defined in: registry/types.ts:121

***

### canvasSlots?

> `optional` **canvasSlots?**: readonly `string`[] \| ((`props`) => readonly `string`[])

Defined in: registry/types.ts:91

***

### category

> **category**: [`CanonicalCategory`](../type-aliases/CanonicalCategory.md)

Defined in: registry/types.ts:72

***

### defaults

> **defaults**: `object`

Defined in: registry/types.ts:93

#### props

> **props**: `Props`

#### style

> **style**: [`NodeStyle`](NodeStyle.md)

***

### displayName

> **displayName**: `string`

Defined in: registry/types.ts:73

***

### hidden?

> `optional` **hidden?**: `boolean`

Defined in: registry/types.ts:106

***

### hiddenPropFields?

> `optional` **hiddenPropFields?**: readonly `string`[]

Defined in: registry/types.ts:129

***

### id

> **id**: `string`

Defined in: registry/types.ts:71

***

### isCanvas

> **isCanvas**: `boolean`

Defined in: registry/types.ts:78

***

### propsSchema

> **propsSchema**: `ZodType`\<`Props`\>

Defined in: registry/types.ts:92

***

### slotComponent?

> `optional` **slotComponent?**: `string`

Defined in: registry/types.ts:115

***

### styleSlots

> **styleSlots**: readonly `string`[]

Defined in: registry/types.ts:79

***

### tags

> **tags**: readonly `string`[]

Defined in: registry/types.ts:74
