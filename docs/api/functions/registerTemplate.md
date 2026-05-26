[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / registerTemplate

# Function: registerTemplate()

> **registerTemplate**(`def`): `void`

Defined in: persistence/templates/registry.ts:62

Register a starter template. Throws on duplicate id; call
`unregisterTemplate(id)` first to replace a built-in. Mutating the
registry bumps the version counter so the TemplatePicker reflects
the change.

## Parameters

### def

[`TemplateDefinition`](../interfaces/TemplateDefinition.md)

## Returns

`void`
