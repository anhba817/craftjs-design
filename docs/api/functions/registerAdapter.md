[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / registerAdapter

# Function: registerAdapter()

> **registerAdapter**(`adapter`): `void`

Defined in: adapters/AdapterContext.tsx:82

Register an adapter — a UI library binding that provides renderers for
each canonical id. Validates the manifest structurally (Zod) before
mutating registry state; throws with a readable message on either a
schema violation or a duplicate id.

Adapters should register at module load so they're available before
`<Editor />` mounts. Post-mount registration works but the
AdapterSwitcher's dropdown captures the list at open time — see
Phase 10 § 2.8 for the hot-reload variant.

## Parameters

### adapter

[`Adapter`](../interfaces/Adapter.md)

The adapter manifest: `{ id, displayName, components,
  classMap?, Wrapper?, mount?, unmount? }`.

## Returns

`void`

## Example

```ts
import { registerAdapter } from '@crafted-design/editor/sdk'
import type { AdapterRenderProps } from '@crafted-design/editor/sdk'

function MyButton({ props, rootRef, className }: AdapterRenderProps) {
  const { label } = props as { label: string }
  return <button ref={rootRef as never} className={className}>{label}</button>
}

registerAdapter({
  id: 'mylib',
  displayName: 'My Library',
  components: { button: MyButton },
})
```
