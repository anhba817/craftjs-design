[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / registerTheme

# Function: registerTheme()

> **registerTheme**(`theme`): `void`

Defined in: themes/registry.ts:40

Register a theme. Throws on duplicate id; call `unregisterTheme(id)`
first to replace a built-in. Mutating the registry bumps the version
counter so the ThemeSwitcher picks up the change.

## Parameters

### theme

[`Theme`](../interfaces/Theme.md)

## Returns

`void`
