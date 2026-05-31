[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / registerTheme

# Function: registerTheme()

> **registerTheme**(`input`): `void`

Defined in: themes/registry.ts:77

Register a theme. Throws on duplicate id; call `unregisterTheme(id)`
first to replace a built-in. Mutating the registry bumps the version
counter so the ThemeSwitcher picks up the change.

Phase 12 § 4.11 — pass `tokens` to author a theme from a small set of
base colors; deriveTokens fills the full core token set and the
`[data-theme]` CSS block is generated + injected automatically.
`dataThemeValue` defaults to the id when omitted.

## Parameters

### input

[`ThemeInput`](../interfaces/ThemeInput.md)

## Returns

`void`
