[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / PanelDefinition

# Interface: PanelDefinition

Defined in: editor/inspector/panel-registry.ts:13

A pluggable Inspector panel — the contract `registerPanel()` accepts.

## Properties

### applicableTo

> **applicableTo**: (`def`) => `boolean`

Defined in: editor/inspector/panel-registry.ts:35

Predicate consulted when the canonical does NOT declare an explicit
`applicablePanels` whitelist. Return true to render the panel for
this canonical. If `applicablePanels` IS set on the canonical, this
predicate is ignored — only ids in the whitelist render.

#### Parameters

##### def

[`CanonicalComponent`](CanonicalComponent.md)\<`any`\>

#### Returns

`boolean`

***

### component

> **component**: `ComponentType`\<\{ `nodeId`: `string`; `nodeIds`: readonly `string`[]; `slot`: `string`; \}\>

Defined in: editor/inspector/panel-registry.ts:46

The panel UI. Receives the primary selected node id, the full
selection (length >= 1 in multi-mode), and the active style slot
(`'root'` for Pattern A canonicals; named slot for Pattern B).

`nodeId === nodeIds[0]` always — panels that don't care about
multi-selection can ignore `nodeIds` and keep operating on a
single node. Style panels opt into multi-mode by reading nodeIds
and routing through useNodeClassesMulti.

***

### displayName

> **displayName**: `string`

Defined in: editor/inspector/panel-registry.ts:22

Section header shown in the Inspector.

***

### id

> **id**: `string`

Defined in: editor/inspector/panel-registry.ts:20

Stable identifier. Matches `CanonicalComponent.applicablePanels`
entries when a canonical explicitly whitelists panels. Built-ins use:
`'layout' | 'size' | 'spacing' | 'typography' | 'appearance' |
'effects' | 'componentProps'`.

***

### order

> **order**: `number`

Defined in: editor/inspector/panel-registry.ts:27

Sort key. Built-ins use 10, 20, 30, … so custom panels can interleave.
Lower numbers render first.
