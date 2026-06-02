[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / useActiveAdapter

# Function: useActiveAdapter()

> **useActiveAdapter**(): [`Adapter`](../interfaces/Adapter.md)

Defined in: adapters/AdapterContext.tsx:213

Hook returning the currently-active adapter. The active adapter changes
when the user picks a different one in the AdapterSwitcher (or when a
loaded document sets `adapterId` on its envelope). Reads from
`<AdapterProvider>`; throws if called outside the editor's React tree.

Adapter authors don't typically need this — adapters' own components
receive props via `AdapterRenderProps`. SDK consumers writing custom
panels can use it to read the active adapter's `classMap` or metadata.

## Returns

[`Adapter`](../interfaces/Adapter.md)
