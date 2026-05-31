[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / FontToken

# Interface: FontToken

Defined in: registry/fonts.ts:18

A font-family choice the designer can apply via the Typography panel.

## Extended by

- [`GoogleFont`](GoogleFont.md)

## Properties

### family

> **family**: `string`

Defined in: registry/fonts.ts:31

CSS `font-family` value, e.g. `'Inter Variable', sans-serif` or
`var(--font-sans)`. When `url` is set, the token's id is prepended
as the primary family so the loaded font is used.

***

### id

> **id**: `string`

Defined in: registry/fonts.ts:23

Used as the className suffix: `font-<id>`. Must match
`/^[a-z0-9-]+$/` (lowercase + digits + hyphens).

***

### name

> **name**: `string`

Defined in: registry/fonts.ts:25

Display name shown in the Typography panel dropdown.

***

### url?

> `optional` **url?**: `string`

Defined in: registry/fonts.ts:37

Optional URL for `@font-face`. When set, the runtime injects an
`@font-face` declaration that loads the font; the browser fetches
and applies it.
