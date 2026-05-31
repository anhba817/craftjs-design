[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / EditorImageProvider

# Function: EditorImageProvider()

> **EditorImageProvider**(`__namedParameters`): `Element`

Defined in: editor/assets/EditorImageProvider.tsx:131

Host integration point. Wrap the editor:

```tsx
<EditorImageProvider value={myBackend}>
  <Editor />
</EditorImageProvider>
```

`value` may omit `canList` for convenience — it defaults to
`true` when a custom `list` is supplied (hosts that pass a
provider almost always can list). Pass `canList: false`
explicitly to opt out.

## Parameters

### \_\_namedParameters

#### children

`ReactNode`

#### value

`Partial`\<[`EditorImageProviderValue`](../interfaces/EditorImageProviderValue.md)\> & `Pick`\<[`EditorImageProviderValue`](../interfaces/EditorImageProviderValue.md), `"list"` \| `"upload"`\>

## Returns

`Element`
