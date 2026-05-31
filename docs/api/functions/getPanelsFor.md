[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / getPanelsFor

# Function: getPanelsFor()

> **getPanelsFor**(`def`): [`PanelDefinition`](../interfaces/PanelDefinition.md)[]

Defined in: editor/inspector/panel-registry.ts:108

Returns the panels that should render for the given canonical.

Resolution rules:
  - If the canonical declares `applicablePanels`, that's a whitelist:
    only registered panels whose id appears in the list render. Custom
    panels not in the list are excluded.
  - Otherwise, each panel's `applicableTo` predicate decides.

## Parameters

### def

[`CanonicalComponent`](../interfaces/CanonicalComponent.md)\<`any`\>

## Returns

[`PanelDefinition`](../interfaces/PanelDefinition.md)[]
