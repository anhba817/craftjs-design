[**@crafted-design/editor SDK**](../README.md)

***

[@crafted-design/editor SDK](../README.md) / defaultImageProvider

# Variable: defaultImageProvider

> `const` **defaultImageProvider**: [`EditorImageProviderValue`](../interfaces/EditorImageProviderValue.md)

Defined in: editor/assets/EditorImageProvider.tsx:75

Default provider: encode the file to a base64 data: URL inline and
remember it for the session so list() can surface it. Used whenever
the host doesn't wrap the editor in its own <EditorImageProvider>.

`canList` stays false: the session list is ephemeral and small, so
the standalone Assets inspector panel stays host-only. The
ImagePicker's library modal calls list() directly regardless of
canList and unions it with the current document's images.
