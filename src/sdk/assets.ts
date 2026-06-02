// Public SDK — image/asset backend integration (Phase 11 § 3.10).
//
// Hosts wrap the editor in <EditorImageProvider value={...}> to route
// image uploads + listing to their own backend (S3, CDN, etc.).
// Without a wrapper, the editor uses a default base64-inline provider
// so it works standalone.
//
// @example
// ```tsx
// import { EditorImageProvider } from '@crafted-design/editor/sdk'
// import { Editor } from '@crafted-design/editor'
//
// const backend = {
//   async upload(file: File) {
//     const { url } = await myApi.upload(file)
//     return { url }
//   },
//   async list() {
//     return (await myApi.listImages()).map((u) => ({ url: u }))
//   },
//   async delete(url: string) {
//     await myApi.deleteImage(url)
//   },
// }
//
// function App() {
//   return (
//     <EditorImageProvider value={backend}>
//       <Editor />
//     </EditorImageProvider>
//   )
// }
// ```

export {
  EditorImageProvider,
  useEditorImageProvider,
  defaultImageProvider,
} from '../editor/assets/EditorImageProvider'
export type {
  EditorImageAsset,
  EditorImageProviderValue,
} from '../editor/assets/EditorImageProvider'
