[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / themeTokensToCss

# Function: themeTokensToCss()

> **themeTokensToCss**(`dataThemeValue`, `tokens`, `darkTokens?`): `string`

Defined in: themes/tokens.ts:144

Render a theme's token set(s) as CSS. The light variant is scoped to
`[data-theme="…"]`; the optional dark variant to `.dark[data-theme="…"]`
(the ThemeProvider sets `.dark` alongside `data-theme` on the canvas
wrapper, so the compound selector wins by specificity when dark is on).
`dataThemeValue` must be a non-empty data-theme value.

## Parameters

### dataThemeValue

`string`

### tokens

[`ThemeTokens`](../interfaces/ThemeTokens.md)

### darkTokens?

[`ThemeTokens`](../interfaces/ThemeTokens.md)

## Returns

`string`
