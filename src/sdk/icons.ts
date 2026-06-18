// Public SDK — runtime icon resolution (Phase 27).
//
// The Icon canonical (and NavItem) accept ANY icon name; the built-in resolver
// lazy-loads lucide glyphs. A host can replace the entire icon set — their
// design system's icons, Iconify, a curated subset — by registering a resolver
// BEFORE the editor / renderer mounts. Pass no argument to restore the default.
//
// @example
//   import { registerIconResolver } from '@crafted-design/editor/sdk'
//   import { MyIcon } from './icons'
//
//   registerIconResolver((name, sizePx) => <MyIcon name={name} size={sizePx} />)
//
// The resolver returns a ReactNode for an icon name + pixel size. For the
// headless string renderer (renderToStaticMarkup), a host resolver must be
// SYNCHRONOUS to appear in the output (the built-in lucide resolver is handled
// for headless internally).

export { registerIconResolver } from '../icons/resolver'
export type { IconResolver } from '../icons/resolver'
