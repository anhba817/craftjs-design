[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / registerFontToken

# Function: registerFontToken()

> **registerFontToken**(`token`): `void`

Defined in: registry/fonts.ts:173

Register a font token so it appears in the Typography panel's Font
dropdown. URL-backed tokens trigger an `@font-face` declaration; the
browser fetches the font and the per-token `.font-<id>` CSS rule
applies it.

Throws if `token.id` doesn't match `/^[a-z0-9-]+$/`. Use
`unregisterFontToken(id)` first to replace a built-in.

## Parameters

### token

[`FontToken`](../interfaces/FontToken.md)

## Returns

`void`

## Example

```ts
import { registerFontToken } from '@crafted-design/editor/sdk'

registerFontToken({
  id: 'inter',
  name: 'Inter',
  family: '"Inter Variable", sans-serif',
  url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
})
```
