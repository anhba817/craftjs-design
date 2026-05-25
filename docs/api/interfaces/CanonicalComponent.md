[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / CanonicalComponent

# Interface: CanonicalComponent\<Props\>

Defined in: registry/types.ts:43

## Type Parameters

### Props

`Props` = `Record`\<`string`, `unknown`\>

## Properties

### applicablePanels?

> `optional` **applicablePanels?**: readonly [`PanelId`](../type-aliases/PanelId.md)[]

Defined in: registry/types.ts:74

***

### canvasSlots?

> `optional` **canvasSlots?**: readonly `string`[] \| ((`props`) => readonly `string`[])

Defined in: registry/types.ts:64

***

### category

> **category**: [`CanonicalCategory`](../type-aliases/CanonicalCategory.md)

Defined in: registry/types.ts:45

***

### defaults

> **defaults**: `object`

Defined in: registry/types.ts:66

#### props

> **props**: `Props`

#### style

> **style**: [`NodeStyle`](NodeStyle.md)

***

### displayName

> **displayName**: `string`

Defined in: registry/types.ts:46

***

### id

> **id**: `string`

Defined in: registry/types.ts:44

***

### isCanvas

> **isCanvas**: `boolean`

Defined in: registry/types.ts:51

***

### propsSchema

> **propsSchema**: `ZodType`\<`Props`\>

Defined in: registry/types.ts:65

***

### styleSlots

> **styleSlots**: readonly `string`[]

Defined in: registry/types.ts:52

***

### tags

> **tags**: readonly `string`[]

Defined in: registry/types.ts:47
