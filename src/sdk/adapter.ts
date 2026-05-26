// Public SDK — adapter authoring surface.
//
// An adapter wraps a UI library (shadcn, MUI, Chakra, …) and provides
// renderers for each canonical id. The editor instantiates components from
// the active adapter at render time; swapping adapters does NOT migrate
// documents — only the rendering changes.
//
// @example
//   import { registerAdapter } from '@design/sdk'
//   import type { AdapterRenderProps } from '@design/sdk'
//
//   function MyButton({ props, rootRef, className }: AdapterRenderProps) {
//     const { label } = props as { label: string }
//     return <button ref={rootRef as never} className={className}>{label}</button>
//   }
//
//   registerAdapter({
//     id: 'mylib',
//     displayName: 'My Library',
//     components: { button: MyButton },
//   })

export type {
  Adapter,
  AdapterRenderProps,
  ClassMapFn,
  ClassMapResult,
} from '../adapters/types'

export {
  registerAdapter,
  unregisterAdapter,
  listAdapters,
  useActiveAdapter,
} from '../adapters/AdapterContext'
