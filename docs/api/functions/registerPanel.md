[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / registerPanel

# Function: registerPanel()

> **registerPanel**(`panel`): `void`

Defined in: editor/inspector/panel-registry.ts:75

Register an inspector panel. Re-registering an existing id replaces
the previous definition — used by SDK consumers overriding a built-in.

Built-in ids: `'layout'`, `'size'`, `'spacing'`, `'typography'`,
`'appearance'`, `'effects'`, `'componentProps'`.

## Parameters

### panel

[`PanelDefinition`](../interfaces/PanelDefinition.md)

## Returns

`void`

## Example

```ts
import { registerPanel, useNodeClasses } from '@crafted-design/editor/sdk'

function NotesPanel({ nodeId }: { nodeId: string }) {
  const { classString, writeClasses } = useNodeClasses(nodeId)
  return (
    <textarea
      value={classString}
      onChange={(e) => writeClasses(e.target.value)}
    />
  )
}

registerPanel({
  id: 'notes',
  displayName: 'Notes',
  order: 100,           // after every built-in (max 70)
  applicableTo: () => true,
  component: NotesPanel,
})
```
