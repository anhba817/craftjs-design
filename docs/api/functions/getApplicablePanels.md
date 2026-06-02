[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / getApplicablePanels

# Function: getApplicablePanels()

> **getApplicablePanels**(`c`): [`PanelId`](../type-aliases/PanelId.md)[]

Defined in: registry/registry.ts:204

Resolve which inspector panels apply to a canonical. Honours an
explicit `applicablePanels` field on the canonical if present;
otherwise derives a sensible default from `category` + `isCanvas`:

  - Every canonical gets `spacing`, `size`, `appearance`, `effects`,
    `componentProps`.
  - Containers (`isCanvas`) additionally get `layout`.
  - Content / layout categories additionally get `typography`. The
    `input` category omits typography because library primitives
    (shadcn / MUI inputs) override text-* utilities internally.

## Parameters

### c

[`CanonicalComponent`](../interfaces/CanonicalComponent.md)\<`any`\>

## Returns

[`PanelId`](../type-aliases/PanelId.md)[]
