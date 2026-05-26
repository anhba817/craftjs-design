[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / TemplateDefinition

# Interface: TemplateDefinition

Defined in: persistence/templates/registry.ts:13

A starter document the user can pick from the New-from-template menu.

## Properties

### description

> **description**: `string`

Defined in: persistence/templates/registry.ts:19

One-line description shown under the name.

***

### envelope

> **envelope**: `object`

Defined in: persistence/templates/registry.ts:21

The actual document envelope inserted when the user picks this template.

#### adapterId

> **adapterId**: `string`

#### craftJson

> **craftJson**: `string`

#### themeId?

> `optional` **themeId?**: `string`

#### version

> **version**: `1`

***

### id

> **id**: `string`

Defined in: persistence/templates/registry.ts:15

Stable identifier. Used as the dedupe key + the picker's React key.

***

### name

> **name**: `string`

Defined in: persistence/templates/registry.ts:17

Display name shown in the picker.
