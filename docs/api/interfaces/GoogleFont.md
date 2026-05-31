[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / GoogleFont

# Interface: GoogleFont

Defined in: registry/curated-fonts.ts:40

A font-family choice the designer can apply via the Typography panel.

## Extends

- [`FontToken`](FontToken.md)

## Properties

### family

> **family**: `string`

Defined in: registry/fonts.ts:31

CSS `font-family` value, e.g. `'Inter Variable', sans-serif` or
`var(--font-sans)`. When `url` is set, the token's id is prepended
as the primary family so the loaded font is used.

#### Inherited from

[`FontToken`](FontToken.md).[`family`](FontToken.md#family)

***

### googleSpec

> **googleSpec**: `string`

Defined in: registry/curated-fonts.ts:42

***

### id

> **id**: `string`

Defined in: registry/fonts.ts:23

Used as the className suffix: `font-<id>`. Must match
`/^[a-z0-9-]+$/` (lowercase + digits + hyphens).

#### Inherited from

[`FontToken`](FontToken.md).[`id`](FontToken.md#id)

***

### name

> **name**: `string`

Defined in: registry/fonts.ts:25

Display name shown in the Typography panel dropdown.

#### Inherited from

[`FontToken`](FontToken.md).[`name`](FontToken.md#name)

***

### url?

> `optional` **url?**: `string`

Defined in: registry/fonts.ts:37

Optional URL for `@font-face`. When set, the runtime injects an
`@font-face` declaration that loads the font; the browser fetches
and applies it.

#### Inherited from

[`FontToken`](FontToken.md).[`url`](FontToken.md#url)
