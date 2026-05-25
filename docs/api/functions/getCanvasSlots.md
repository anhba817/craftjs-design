[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / getCanvasSlots

# Function: getCanvasSlots()

> **getCanvasSlots**(`c`, `nodeProps?`): readonly `string`[]

Defined in: registry/registry.ts:167

Resolve the canvas-slot list for a canonical. When `canvasSlots` is
declared explicitly, it wins (multi-canvas Pattern B). Function form
(Phase 7) is called with the current node's props for dynamic counts
(e.g., Tabs: one slot per tab). Otherwise the legacy rule holds:
`isCanvas=true` → `['root']` (Pattern A single canvas), false → `[]`.

## Parameters

### c

[`CanonicalComponent`](../interfaces/CanonicalComponent.md)\<`any`\>

The canonical definition.

### nodeProps?

`Record`\<`string`, `unknown`\>

Current node props, used only when `canvasSlots` is
  a function. Optional for the static cases.

## Returns

readonly `string`[]

The slot keys for this canonical instance.
